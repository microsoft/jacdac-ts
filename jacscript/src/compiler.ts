import * as esprima from "esprima"

import * as estree from "estree"
import {
    range,
    read32,
    stringToUint8Array,
    toHex,
    toUTF8,
    write16,
    write32,
    serviceSpecificationFromName,
    jdpack,
    camelize,
    CMD_SET_REG,
    strcmp,
    SystemReg,
    CMD_GET_REG,
    SRV_JACSCRIPT_CONDITION,
} from "jacdac-ts"

import {
    BinFmt,
    bitSize,
    CellDebugInfo,
    CellKind,
    DebugInfo,
    FunctionDebugInfo,
    Host,
    InstrArgResolver,
    JacError,
    NUM_REGS,
    OpAsync,
    OpBinary,
    OpCall,
    OpFmt,
    OpMath1,
    OpMath2,
    OpRoleProperty,
    OpSync,
    OpTop,
    OpUnary,
    printJacError,
    SMap,
    stringifyCellKind,
    stringifyInstr,
    ValueSpecial,
} from "./format"
import { numSetBits, verifyBinary } from "./verify"

export function oops(msg: string): never {
    throw new Error(msg)
}

export function assert(cond: boolean, msg = "") {
    if (!cond) oops("assertion failed" + (msg ? ": " + msg : ""))
}

export function assertRange(
    min: number,
    v: number,
    max: number,
    desc = "value"
) {
    if (min <= v && v <= max) return
    oops(`${desc}=${v} out of range [${min}, ${max}]`)
}

class Cell {
    index: number
    _name: string

    constructor(
        public definition:
            | estree.VariableDeclarator
            | estree.FunctionDeclaration
            | estree.Identifier,
        public scope: VariableScope
    ) {
        scope.add(this)
    }
    value(): ValueDesc {
        oops("on value() on generic Cell")
    }
    getName() {
        if (!this._name) {
            if (this.definition.type == "Identifier")
                this._name = idName(this.definition)
            else this._name = idName(this.definition.id)
        }
        return this._name
    }
    debugInfo(): CellDebugInfo {
        return {
            name: this.getName(),
        }
    }
}

class DelayedCodeSection {
    startLabel: Label
    returnLabel: Label
    body: ((wr: OpWriter) => void)[] = []

    constructor(public name: string, public parent: Procedure) {}

    empty() {
        return this.body.length == 0
    }

    emit(f: (wr: OpWriter) => void) {
        this.body.push(f)
    }

    callHere() {
        const wr = this.parent.writer
        this.startLabel = wr.mkLabel(this.name + "Start")
        this.returnLabel = wr.mkLabel(this.name + "Ret")
        wr.emitJump(this.startLabel)
        wr.emitLabel(this.returnLabel)
    }

    finalizeRaw() {
        assert(this.parent.parent.proc == this.parent)
        const wr = this.parent.writer
        for (const b of this.body) b(wr)
    }

    finalize() {
        if (this.empty()) {
            this.startLabel.offset = this.returnLabel.offset
            return
        }
        const wr = this.parent.writer
        wr.emitLabel(this.startLabel)
        this.finalizeRaw()
        wr.emitJump(this.returnLabel)
    }
}

class Role extends Cell {
    dispatcher: {
        proc: Procedure
        top: Label
        init: DelayedCodeSection
        checkConnected: DelayedCodeSection
        connected: DelayedCodeSection
        disconnected: DelayedCodeSection
        wasConnected: Variable
    }
    autoRefreshRegs: jdspec.PacketInfo[] = []

    constructor(
        definition: estree.VariableDeclarator,
        scope: VariableScope,
        public spec: jdspec.ServiceSpec
    ) {
        super(definition, scope)
        assert(!!spec)
    }
    value(): ValueDesc {
        return mkValue(CellKind.JD_ROLE, this.index, this)
    }
    encode() {
        return this.index
    }
    serialize() {
        const r = new Uint8Array(BinFmt.RoleHeaderSize)
        write32(r, 0, this.spec.classIdentifier)
        return r
    }
    toString() {
        return `role ${this.getName()}`
    }
    isSensor() {
        return this.spec.packets.some(
            p => p.identifier == SystemReg.StreamingSamples
        )
    }
    isCondition() {
        return this.spec.classIdentifier == SRV_JACSCRIPT_CONDITION
    }
}

class Variable extends Cell {
    isLocal = false

    constructor(
        definition: estree.VariableDeclarator | estree.Identifier,
        scope: VariableScope
    ) {
        super(definition, scope)
    }
    value(): ValueDesc {
        const kind = this.isLocal ? CellKind.LOCAL : CellKind.GLOBAL
        return mkValue(kind, this.index, this)
    }
    toString() {
        return `var ${this.getName()}`
    }
}

class FunctionDecl extends Cell {
    proc: Procedure
    constructor(
        parent: Program,
        definition: estree.FunctionDeclaration,
        scope: VariableScope
    ) {
        super(definition, scope)
        this.proc = new Procedure(parent, this.getName())
        this.proc.numargs = definition.params.length
    }
    value(): ValueDesc {
        return mkValue(CellKind.X_FUNCTION, this.index, this)
    }
    toString() {
        return `function ${this.getName()}`
    }
}

interface ValueDesc {
    kind: CellKind
    index: number
    cell?: Cell
    spec?: jdspec.PacketInfo
    litValue?: number
}

function mkValue(kind: CellKind, index: number, cell?: Cell): ValueDesc {
    return {
        kind,
        index,
        cell,
    }
}

function floatVal(v: number) {
    const r = mkValue(CellKind.X_FLOAT, v)
    r.litValue = v
    return r
}

function idName(pat: estree.BaseExpression) {
    if (pat.type != "Identifier") return null
    return (pat as estree.Identifier).name
}

function addUnique<T>(arr: T[], v: T) {
    let idx = arr.indexOf(v)
    if (idx < 0) {
        idx = arr.length
        arr.push(v)
    }
    return idx
}

function specialVal(sp: ValueSpecial) {
    return mkValue(CellKind.SPECIAL, sp)
}

function matchesName(specName: string, jsName: string) {
    return camelize(specName) == jsName
}

const reservedFunctions: SMap<number> = {
    wait: 1,
    every: 1,
    upload: 1,
    print: 1,
    format: 1,
    panic: 1,
    reboot: 1,
    isNaN: 1,
}

const values = {
    zero: floatVal(0),
    one: floatVal(1),
    nan: specialVal(ValueSpecial.NAN),
    error: mkValue(CellKind.ERROR, 0),
}

class Label {
    uses: number[] = []
    offset = -1
    constructor(public name: string) {}
}

const BUFFER_REG = NUM_REGS + 1

class OpWriter {
    private allocatedRegs: ValueDesc[] = []
    private allocatedRegsMask = 0
    private scopes: ValueDesc[][] = []
    private binary: number[] = []
    private labels: Label[] = []
    top: Label
    ret: Label
    private assembly: (string | number)[] = []
    private assemblyPtr = 0
    private lineNo = -1
    private lineNoStart = -1
    desc = new Uint8Array(BinFmt.FunctionHeaderSize)
    offsetInFuncs = -1
    private maxRegs = 0
    private srcmap: number[] = []

    constructor(public parent: Procedure) {
        this.top = this.mkLabel("top")
        this.ret = this.mkLabel("ret")
        this.emitLabel(this.top)
    }

    debugInfo(): FunctionDebugInfo {
        this.forceFinStmt()
        return {
            name: this.parent.name,
            srcmap: this.srcmap,
            locals: this.parent.locals.list.map(v => v.debugInfo()),
        }
    }

    serialize() {
        if (this.binary.length & 1) this.emitSync(OpSync.RETURN)
        return new Uint8Array(new Uint16Array(this.binary).buffer)
    }

    finalizeDesc(off: number) {
        assert((this.binary.length & 1) == 0)
        const flags = 0
        this.desc.set(
            jdpack("u32 u32 u16 u8 u8", [
                off,
                this.binary.length * 2,
                this.parent.locals.list.length,
                this.maxRegs | (this.parent.numargs << 4),
                flags,
            ])
        )
    }

    numScopes() {
        return this.scopes.length
    }

    numRegsInTopScope() {
        return this.scopes[this.scopes.length - 1].length
    }

    emitDbg(msg: string) {
        this.emitComment(msg)
    }

    private forceFinStmt() {
        if (this.lineNo < 0) return
        const len = this.binary.length - this.lineNoStart
        if (len) this.srcmap.push(this.lineNo, this.lineNoStart, len)
    }

    stmtStart(lineNo: number) {
        if (this.lineNo == lineNo) return
        this.forceFinStmt()
        this.lineNo = lineNo
        this.lineNoStart = this.binary.length
    }

    stmtEnd() {
        if (false)
            this.emitDbg(
                `reg=${this.allocatedRegsMask.toString(16)} ${
                    this.scopes.length
                } ${this.scopes.map(s => s.length).join(",")}`
            )
    }

    push() {
        this.scopes.push([])
    }

    popExcept(save?: ValueDesc) {
        const scope = this.scopes.pop()
        let found = false
        for (const r of scope) {
            if (r == save) found = true
            else this.freeReg(r)
        }
        if (save) {
            assert(found)
            this.scopes[this.scopes.length - 1].push(save)
        }
    }

    pop() {
        this.popExcept(null)
    }

    allocBuf(): ValueDesc {
        if (this.allocatedRegsMask & (1 << BUFFER_REG))
            this.parent.parent.throwError(null, "buffer already in use")
        return this.doAlloc(BUFFER_REG, CellKind.JD_CURR_BUFFER)
    }

    private doAlloc(regno: number, kind = CellKind.X_FP_REG) {
        assert(regno != -1)
        if (this.allocatedRegsMask & (1 << regno))
            this.parent.parent.throwError(
                null,
                `expression too complex (R${regno} allocated)`
            )
        this.allocatedRegsMask |= 1 << regno
        const r = mkValue(kind, regno)
        this.allocatedRegs.push(r)
        this.scopes[this.scopes.length - 1].push(r)
        return r
    }

    allocArgs(num: number): ValueDesc[] {
        return range(num).map(x => this.doAlloc(x))
    }

    allocReg(): ValueDesc {
        let regno = -1
        for (let i = NUM_REGS - 1; i >= 0; i--) {
            if (!(this.allocatedRegsMask & (1 << i))) {
                regno = i
                break
            }
        }
        return this.doAlloc(regno)
    }

    freeReg(v: ValueDesc) {
        const idx = this.allocatedRegs.indexOf(v)
        assert(idx >= 0)
        this.allocatedRegs.splice(idx, 1)
        this.allocatedRegsMask &= ~(1 << v.index)
    }

    emitString(s: string) {
        return mkValue(
            CellKind.X_STRING,
            addUnique(this.parent.parent.stringLiterals, s)
        )
    }

    isReg(v: ValueDesc) {
        if (v.kind == CellKind.X_FP_REG) {
            assert((this.allocatedRegsMask & (1 << v.index)) != 0)
            return true
        } else {
            return false
        }
    }

    emitRaw(op: OpTop, arg: number) {
        assert(arg >> 12 == 0)
        assertRange(0, op, 0xf)
        this.emitInstr((op << 12) | arg)
    }

    emitPrefix(a: number, b: number = 0, c: number = 0, d: number = 0) {
        const vals = [a, b, c, d]
        for (let i = 0; i < 4; ++i) {
            const v = vals[i]
            if (!v) continue
            const high = v >> 12
            this.emitRaw(OpTop.SET_A + i, v & 0xfff)
            if (high) {
                assert(high >> 4 == 0)
                this.emitRaw(OpTop.SET_HIGH, (i << 10) | high)
            }
        }
    }

    emitSync(
        op: OpSync,
        a: number = 0,
        b: number = 0,
        c: number = 0,
        d: number = 0
    ) {
        this.emitPrefix(a >> 4, b, c, d)
        assertRange(0, op, OpSync._LAST)
        this.emitRaw(OpTop.SYNC, ((a & 0xf) << 8) | op)
    }

    private saveRegs() {
        const d = this.allocatedRegsMask & 0xffff
        const regs = numSetBits(d)
        if (regs > this.maxRegs) this.maxRegs = regs
        return d
    }

    emitAsync(op: OpAsync, a: number = 0, b: number = 0, c: number = 0) {
        const d = this.saveRegs()
        this.emitPrefix(a, b, c, d >> 4)
        assertRange(0, op, OpAsync._LAST)
        this.emitRaw(OpTop.ASYNC, ((d & 0xf) << 8) | op)
    }

    emitMov(dst: number, src: number) {
        this.emitRaw(OpTop.UNARY, (OpUnary.ID << 8) | (dst << 4) | src)
    }

    forceReg(v: ValueDesc) {
        if (this.isReg(v)) return v
        const r = this.allocReg()
        this.assign(r, v)
        return r
    }

    assign(dst: ValueDesc, src: ValueDesc) {
        if (src == dst) return
        if (this.isReg(dst)) {
            this.emitLoadCell(dst, src.kind, src.index)
        } else if (this.isReg(src)) {
            this.emitStoreCell(dst.kind, dst.index, src)
        } else {
            this.push()
            const r = this.allocReg()
            this.assign(r, src)
            this.assign(dst, r)
            this.pop()
        }
    }

    private emitFloatLiteral(dst: ValueDesc, v: number) {
        if (isNaN(v)) {
            this.emitLoadCell(dst, CellKind.SPECIAL, ValueSpecial.NAN)
        } else if ((v | 0) == v && 0 <= v && v <= 0xffff) {
            this.emitLoadCell(dst, CellKind.IDENTITY, v)
        } else {
            this.emitLoadCell(
                dst,
                CellKind.FLOAT_CONST,
                addUnique(this.parent.parent.floatLiterals, v)
            )
        }
    }

    emitLoadCell(dst: ValueDesc, celltype: CellKind, idx: number, c = 0) {
        assert(this.isReg(dst))
        switch (celltype) {
            case CellKind.LOCAL:
            case CellKind.GLOBAL:
            case CellKind.FLOAT_CONST:
            case CellKind.IDENTITY:
            case CellKind.BUFFER:
            case CellKind.SPECIAL:
            case CellKind.ROLE_PROPERTY:
                this.emitLoadStoreCell(OpTop.LOAD_CELL, dst, celltype, idx, c)
                break
            case CellKind.X_FP_REG:
                this.emitMov(dst.index, idx)
                break
            case CellKind.X_FLOAT:
                this.emitFloatLiteral(dst, idx)
                break
            case CellKind.ERROR:
                // ignore
                break
            default:
                oops("can't load")
                break
        }
    }

    emitStoreCell(celltype: CellKind, idx: number, src: ValueDesc) {
        switch (celltype) {
            case CellKind.LOCAL:
            case CellKind.GLOBAL:
            case CellKind.BUFFER:
                this.emitLoadStoreCell(OpTop.STORE_CELL, src, celltype, idx, 0)
                break
            case CellKind.X_FP_REG:
                this.emitMov(idx, src.index)
                break
            case CellKind.ERROR:
                // ignore
                break
            default:
                oops("can't store")
                break
        }
    }

    private emitLoadStoreCell(
        op: OpTop,
        dst: ValueDesc,
        celltype: CellKind,
        idx: number,
        argC: number
    ) {
        assert(this.isReg(dst))
        const [a, b] = [celltype, idx]
        this.emitPrefix(a >> 2, b >> 6, argC || 0)
        // DST[4] A:OP[2] B:OFF[6]
        this.emitRaw(
            op,
            (dst.index << 8) | ((celltype & 0x3) << 6) | (idx & 0x3f)
        )
    }

    emitStoreByte(src: ValueDesc, off = 0) {
        assert(this.isReg(src))
        assertRange(0, off, 0xff)
        this.emitLoadStoreCell(
            OpTop.STORE_CELL,
            src,
            CellKind.BUFFER,
            OpFmt.U8,
            off
        )
    }

    emitBufOp(
        op: OpTop,
        dst: ValueDesc,
        off: number,
        mem: jdspec.PacketMember
    ) {
        assert(this.isReg(dst))
        let fmt = OpFmt.U8
        let sz = mem.storage
        if (sz < 0) {
            fmt = OpFmt.I8
            sz = -sz
        }
        switch (sz) {
            case 1:
                break
            case 2:
                fmt |= OpFmt.U16
                break
            case 4:
                fmt |= OpFmt.U32
                break
            case 8:
                fmt |= OpFmt.U64
                break
            default:
                oops("unhandled format: " + mem.storage + " for " + mem.name)
        }

        const shift = mem.shift || 0
        assertRange(0, shift, bitSize(fmt))
        assertRange(0, off, 0xff)

        this.emitLoadStoreCell(
            op,
            dst,
            CellKind.BUFFER,
            fmt | (shift << 4),
            off
        )
    }

    private catchUpAssembly() {
        while (this.assemblyPtr < this.binary.length) {
            this.assembly.push(this.assemblyPtr++)
        }
    }

    private writeAsm(msg: string) {
        this.catchUpAssembly()
        this.assembly.push(msg)
    }

    getAssembly() {
        this.catchUpAssembly()
        let r = ""
        for (const ln of this.assembly) {
            if (typeof ln == "string") r += ln + "\n"
            else {
                this.parent.parent.resolverPC = ln
                r += stringifyInstr(this.binary[ln], this.parent.parent) + "\n"
            }
        }
        return r
    }

    emitComment(msg: string) {
        this.writeAsm("; " + msg.replace(/\n/g, "\n; "))
    }

    emitInstr(v: number) {
        v >>>= 0
        assertRange(0, v, 0xffff)
        this.binary.push(v)
    }

    mkLabel(name: string) {
        const l = new Label(name)
        this.labels.push(l)
        return l
    }

    emitLabel(l: Label) {
        assert(l.offset == -1)
        this.emitComment("lbl " + l.name)
        l.offset = this.binary.length
    }

    emitIfAndPop(reg: ValueDesc, thenBody: () => void, elseBody?: () => void) {
        assert(this.isReg(reg))
        this.pop()
        if (elseBody) {
            const endIf = this.mkLabel("endif")
            const elseIf = this.mkLabel("elseif")
            this.emitJump(elseIf, reg.index)
            thenBody()
            this.emitJump(endIf)
            this.emitLabel(elseIf)
            elseBody()
            this.emitLabel(endIf)
        } else {
            const skipIf = this.mkLabel("skipif")
            this.emitJump(skipIf, reg.index)
            thenBody()
            this.emitLabel(skipIf)
        }
    }

    emitJump(label: Label, cond: number = -1) {
        // JMP = 9, // REG[4] BACK[1] IF_ZERO[1] B:OFF[6]
        this.emitComment("jump " + label.name)
        label.uses.push(this.binary.length)
        this.emitRaw(OpTop.SET_B, 0)
        this.emitRaw(OpTop.JUMP, cond == -1 ? 0 : (cond << 8) | (1 << 6))
    }

    patchLabels() {
        for (const l of this.labels) {
            if (l.uses.length == 0) continue
            assert(l.offset != -1, `label ${l.name} emitted`)
            for (const u of l.uses) {
                let op0 = this.binary[u]
                let op1 = this.binary[u + 1]
                assert(op0 >> 12 == OpTop.SET_B)
                assert(op1 >> 12 == OpTop.JUMP)
                let off = l.offset - u - 2
                assert(off != -2) // avoid simple infinite loop
                if (off < 0) {
                    off = -off
                    op1 |= 1 << 7
                }
                assert((op0 & 0xfff) == 0)
                assert((op1 & 0x3f) == 0)
                assertRange(0, off, 0x3ffff)
                op0 |= off >> 6
                op1 |= off & 0x3f
                this.binary[u] = op0 >>> 0
                this.binary[u + 1] = op1 >>> 0
            }
        }
    }

    emitCall(proc: Procedure, op = OpCall.SYNC) {
        let d = 0
        if (op == OpCall.SYNC) d = this.saveRegs()
        this.emitPrefix(proc.index >> 6, 0, 0, d)
        this.emitRaw(
            OpTop.CALL,
            (proc.numargs << 8) | (op << 6) | (proc.index & 0x3f)
        )
    }

    emitUnary(op: OpUnary, left: ValueDesc, right: ValueDesc) {
        assert(this.isReg(left))
        assert(this.isReg(right))
        assertRange(0, op, 0xf)
        this.emitRaw(OpTop.UNARY, (op << 8) | (left.index << 4) | right.index)
    }

    emitBin(op: OpBinary, left: ValueDesc, right: ValueDesc) {
        assert(this.isReg(left))
        assert(this.isReg(right))
        assertRange(0, op, 0xf)
        this.emitRaw(OpTop.BINARY, (op << 8) | (left.index << 4) | right.index)
    }
}

class SectionWriter {
    offset = -1
    currSize = 0
    data: Uint8Array[] = []
    desc = new Uint8Array(BinFmt.SectionHeaderSize)

    constructor(public size = -1) {}

    finalize(off: number) {
        assert(this.offset == -1 || this.offset == off)
        this.offset = off
        if (this.size == -1) this.size = this.currSize
        assert(this.size == this.currSize)
        assert((this.offset & 3) == 0)
        assert((this.size & 3) == 0)
        write32(this.desc, 0, this.offset)
        write32(this.desc, 4, this.size)
    }

    align() {
        while (this.currSize & 3) this.append(new Uint8Array([0]))
    }

    append(buf: Uint8Array) {
        this.data.push(buf)
        this.currSize += buf.length
        if (this.size >= 0) assertRange(0, this.currSize, this.size)
    }
}

class Procedure {
    writer = new OpWriter(this)
    index: number
    numargs = 0
    locals: VariableScope
    constructor(public parent: Program, public name: string) {
        this.index = this.parent.procs.length
        this.parent.procs.push(this)
        this.locals = new VariableScope(this.parent.globals)
    }
    toString() {
        return `proc ${this.name}:\n${this.writer.getAssembly()}`
    }
    finalize() {
        this.writer.patchLabels()
    }
    mkTempLocal(name: string) {
        const l = new Variable(null, this.locals)
        l._name = name
        l.isLocal = true
        return l
    }
}

class VariableScope {
    map: SMap<Cell> = {}
    list: Cell[] = []
    constructor(public parent: VariableScope) {}

    lookup(name: string): Cell {
        if (this.map.hasOwnProperty(name)) return this.map[name]
        if (this.parent) return this.parent.lookup(name)
        return undefined
    }

    add(cell: Cell) {
        cell.index = this.list.length
        this.list.push(cell)
        if (cell.definition) this.map[cell.getName()] = cell
    }

    describeIndex(idx: number) {
        const v = this.list[idx]
        if (v) return v.getName()
        return undefined
    }

    sort() {
        this.list.sort((a, b) => strcmp(a.getName(), b.getName()))
        for (let i = 0; i < this.list.length; ++i) this.list[i].index = i
    }
}

enum RefreshMS {
    Never = 0,
    Normal = 500,
}

type Expr = estree.Expression | estree.Super | estree.SpreadElement
type Stmt = estree.Statement | estree.Directive | estree.ModuleDeclaration

const mathConst: SMap<number> = {
    E: Math.E,
    PI: Math.PI,
    LN10: Math.LN10,
    LN2: Math.LN2,
    LOG2E: Math.LOG2E,
    LOG10E: Math.LOG10E,
    SQRT1_2: Math.SQRT1_2,
    SQRT2: Math.SQRT2,
}

class Program implements InstrArgResolver {
    roles = new VariableScope(null)
    functions = new VariableScope(null)
    globals = new VariableScope(this.roles)
    tree: estree.Program
    procs: Procedure[] = []
    floatLiterals: number[] = []
    intLiterals: number[] = []
    stringLiterals: string[] = []
    writer: OpWriter
    proc: Procedure
    sysSpec = serviceSpecificationFromName("_system")
    refreshMS: number[] = [0, 500]
    resolverParams: number[]
    resolverPC: number
    numErrors = 0
    main: Procedure
    startDispatchers: DelayedCodeSection

    constructor(public host: Host, public source: string) {}

    indexToLine(idx: number) {
        const s = this.source.slice(0, idx)
        return s.replace(/[^\n]/g, "").length + 1
    }

    indexToPos(idx: number) {
        const s = this.source.slice(0, idx)
        const line = s.replace(/[^\n]/g, "").length + 1
        const column = s.replace(/.*\n/, "").length + 1
        return { line, column }
    }

    throwError(expr: estree.BaseNode, msg: string): never {
        const err = new Error(msg)
        ;(err as any).sourceNode = expr
        throw err
    }

    reportError(range: number[], msg: string): ValueDesc {
        this.numErrors++
        const err: JacError = {
            ...this.indexToPos(range[0]),
            message: msg,
            codeFragment: this.sourceFrag(range),
        }
        ;(this.host.error || printJacError)(err)
        return values.error
    }

    describeCell(t: CellKind, idx: number): string {
        switch (t) {
            //case CellKind.LOCAL:
            //    return this.proc.locals.describeIndex(idx)
            case CellKind.GLOBAL:
                return this.globals.describeIndex(idx)
            case CellKind.FLOAT_CONST:
                return this.floatLiterals[idx] + ""
            default:
                return undefined
        }
    }

    funName(idx: number): string {
        const p = this.procs[idx]
        if (p) return p.name
    }

    roleName(idx: number): string {
        return this.roles.describeIndex(idx)
    }

    private roleDispatcher(role: Role) {
        if (!role.dispatcher) {
            const proc = new Procedure(this, role.getName() + "_disp")
            role.dispatcher = {
                proc,
                top: proc.writer.mkLabel("disp_top"),
                init: new DelayedCodeSection("init", proc),
                disconnected: new DelayedCodeSection("disconnected", proc),
                connected: new DelayedCodeSection("connected", proc),
                checkConnected: new DelayedCodeSection("checkConnected", proc),
                wasConnected: proc.mkTempLocal("connected_" + role.getName()),
            }
            this.withProcedure(proc, wr => {
                wr.push()
                const conn = this.emitIsRoleConnected(role)
                wr.assign(role.dispatcher.wasConnected.value(), conn)
                wr.pop()
                role.dispatcher.init.callHere()
                wr.emitLabel(role.dispatcher.top)
                wr.emitSync(OpSync.OBSERVE_ROLE, role.encode())
                wr.emitAsync(OpAsync.YIELD)
                role.dispatcher.checkConnected.callHere()
            })

            this.startDispatchers.emit(wr => {
                // this is only executed once, but with BG_MAX1 is easier to naively analyze memory usage
                wr.emitCall(proc, OpCall.BG_MAX1)
            })
        }
        return role.dispatcher
    }

    private finalizeDispatchers() {
        for (const role of this.roles.list) {
            const disp = (role as Role).dispatcher
            if (disp)
                this.withProcedure(disp.proc, wr => {
                    // forever!
                    wr.emitJump(disp.top)

                    // run init
                    disp.init.finalize()

                    // if any dis/connect handlers, do the checking
                    if (!disp.connected.empty() || !disp.disconnected.empty()) {
                        disp.checkConnected.body.push(wr => {
                            wr.push()
                            const connNow = this.emitIsRoleConnected(
                                role as Role
                            )
                            wr.pop()
                            const nowDis = wr.mkLabel("nowDis")
                            wr.emitJump(nowDis, connNow.index)

                            {
                                // now==connected
                                if (!disp.connected.empty()) {
                                    wr.push()
                                    const connPrev = wr.forceReg(
                                        disp.wasConnected.value()
                                    )
                                    wr.emitUnary(
                                        OpUnary.NOT,
                                        connPrev,
                                        connPrev
                                    )
                                    wr.pop()
                                    wr.emitJump(
                                        disp.checkConnected.returnLabel,
                                        connPrev.index
                                    )
                                    // prev==disconnected

                                    disp.connected.finalizeRaw()
                                }
                                wr.push()
                                wr.assign(
                                    disp.wasConnected.value(),
                                    floatVal(1)
                                )
                                wr.pop()
                                wr.emitJump(disp.checkConnected.returnLabel)
                            }

                            {
                                // now==disconnected
                                if (!disp.disconnected.empty()) {
                                    wr.emitLabel(nowDis)
                                    wr.push()
                                    const connPrev = wr.forceReg(
                                        disp.wasConnected.value()
                                    )
                                    wr.pop()
                                    wr.emitJump(
                                        disp.checkConnected.returnLabel,
                                        connPrev.index
                                    )
                                    // prev==connected
                                    disp.disconnected.finalizeRaw()
                                }
                                wr.push()
                                wr.assign(
                                    disp.wasConnected.value(),
                                    values.zero
                                )
                                wr.pop()
                                wr.emitJump(disp.checkConnected.returnLabel)
                            }
                        })
                    }

                    // either way, finalize checkConnected
                    disp.checkConnected.finalize()
                })
        }
    }

    private finalizeAutoRefresh() {
        const proc = new Procedure(this, "_autoRefresh_")
        const period = 521
        this.withProcedure(proc, wr => {
            for (const role_ of this.roles.list) {
                const role = role_ as Role
                if (role.autoRefreshRegs.length == 0) continue
                wr.push()
                const isConn = this.emitIsRoleConnected(role)
                wr.emitIfAndPop(isConn, () => {
                    for (const reg of role.autoRefreshRegs) {
                        if (
                            reg.identifier == SystemReg.Reading &&
                            role.isSensor()
                        ) {
                            wr.push()
                            wr.emitSync(OpSync.SETUP_BUFFER, 1)
                            const v = wr.forceReg(floatVal(199))
                            wr.emitStoreByte(v, 0)
                            wr.pop()
                            wr.emitAsync(
                                OpAsync.SEND_CMD,
                                role.encode(),
                                SystemReg.StreamingSamples | CMD_SET_REG
                            )
                        } else {
                            wr.emitSync(OpSync.SETUP_BUFFER, 0)
                            wr.emitAsync(
                                OpAsync.SEND_CMD,
                                role.encode(),
                                reg.identifier | CMD_GET_REG
                            )
                        }
                    }
                })
            }
            wr.emitAsync(OpAsync.YIELD, period)
            wr.emitJump(wr.top)
        })

        this.startDispatchers.emit(wr => wr.emitCall(proc, OpCall.BG_MAX1))
    }

    private withProcedure<T>(proc: Procedure, f: (wr: OpWriter) => T) {
        assert(!!proc)
        const prevProc = this.proc
        try {
            this.proc = proc
            this.writer = proc.writer
            proc.writer.push()
            return f(proc.writer)
        } finally {
            proc.writer.pop()
            this.proc = prevProc
            if (prevProc) this.writer = prevProc.writer
        }
    }

    private forceName(
        pat: estree.Expression | estree.Pattern | estree.PrivateIdentifier
    ) {
        const r = idName(pat)
        if (!r) this.throwError(pat, "only simple identifiers supported")
        return (pat as estree.Identifier).name
    }

    private parseRole(decl: estree.VariableDeclarator) {
        const expr = decl.init
        if (expr?.type != "CallExpression") return null
        if (idName(expr.callee) == "condition") {
            this.requireArgs(expr, 0)
            return new Role(
                decl,
                this.roles,
                serviceSpecificationFromName("jacscriptcondition")
            )
        }
        if (expr.callee.type != "MemberExpression") return null
        if (idName(expr.callee.object) != "roles") return null
        const serv = this.forceName(expr.callee.property)
        this.requireArgs(expr, 0)
        const spec = serviceSpecificationFromName(serv.toLowerCase())
        if (!spec) this.throwError(expr.callee, "no such service: " + serv)
        return new Role(decl, this.roles, spec)
    }

    private emitStore(trg: Variable, src: ValueDesc) {
        this.writer.assign(trg.value(), src)
    }

    private newDef(
        decl: { id: estree.Identifier | estree.Pattern } & estree.BaseNode
    ) {
        const id = this.forceName(decl.id)
        if (
            this.roles.lookup(id) ||
            (this.proc?.locals || this.globals).lookup(id) ||
            this.functions.lookup(id)
        )
            this.throwError(decl, `name '${id}' already defined`)
    }

    private emitVariableDeclaration(decls: estree.VariableDeclaration) {
        if (decls.kind != "var") this.throwError(decls, "only 'var' supported")
        for (const decl of decls.declarations) {
            let g: Variable
            if (this.isTopLevel(decl)) {
                const tmp = this.globals.lookup(this.forceName(decl.id))
                if (tmp instanceof Role) continue
                if (tmp instanceof Variable) g = tmp
                else {
                    if (this.numErrors == 0) oops("invalid var: " + tmp)
                    else continue
                }
            } else {
                this.newDef(decl)
                g = new Variable(decl, this.proc.locals)
                g.isLocal = true
            }

            if (decl.init) {
                this.writer.push()
                this.emitStore(g, this.emitSimpleValue(decl.init))
                this.writer.pop()
            }
        }
    }

    private emitIfStatement(stmt: estree.IfStatement) {
        const wr = this.writer
        wr.push()

        let cond = this.emitExpr(stmt.test)
        this.requireRuntimeValue(stmt.test, cond)
        if (cond.kind == CellKind.X_FLOAT) {
            wr.pop()
            if (cond.litValue) this.emitStmt(stmt.consequent)
            else {
                if (stmt.alternate) this.emitStmt(stmt.alternate)
            }
        } else {
            cond = wr.forceReg(cond)
            wr.emitIfAndPop(
                cond,
                () => this.emitStmt(stmt.consequent),
                stmt.alternate ? () => this.emitStmt(stmt.alternate) : null
            )
        }
    }

    private emitReturnStatement(stmt: estree.ReturnStatement) {
        const wr = this.writer
        wr.push()
        if (stmt.argument) {
            const v = this.emitSimpleValue(stmt.argument)
            const r = wr.allocArgs(1)[0]
            wr.assign(r, v)
        } else {
            const r = wr.allocArgs(1)[0]
            wr.assign(r, values.nan)
        }
        wr.pop()
        this.writer.emitJump(this.writer.ret)
    }

    private emitFunctionDeclaration(stmt: estree.FunctionDeclaration) {
        const fundecl = this.functions.list.find(
            f => f.definition === stmt
        ) as FunctionDecl
        if (!this.isTopLevel(stmt))
            this.throwError(stmt, "only top-level functions are supported")
        if (stmt.generator || stmt.async)
            this.throwError(stmt, "async not supported")
        if (!fundecl && this.numErrors) return

        this.withProcedure(fundecl.proc, wr => {
            let idx = 0
            for (const paramdef of stmt.params) {
                if (paramdef.type != "Identifier")
                    this.throwError(
                        paramdef,
                        "only simple identifiers supported as parameters"
                    )
                const v = new Variable(paramdef, fundecl.proc.locals)
                v.isLocal = true
                if (idx >= 8) this.throwError(paramdef, "too many arguments")
            }
            this.emitStmt(stmt.body)
            wr.emitLabel(wr.ret)
            wr.emitSync(OpSync.RETURN)
        })
    }

    private isTopLevel(node: estree.Node) {
        return !!(node as any)._jacsIsTopLevel
    }

    private emitProgram(prog: estree.Program) {
        this.main = new Procedure(this, "main")
        this.startDispatchers = new DelayedCodeSection(
            "startDispatchers",
            this.main
        )
        prog.body.forEach(markTopLevel)
        // pre-declare all functions and globals
        for (const s of prog.body) {
            try {
                switch (s.type) {
                    case "FunctionDeclaration":
                        this.newDef(s)
                        const n = this.forceName(s.id)
                        if (reservedFunctions[n] == 1)
                            this.throwError(
                                s,
                                `function name '${n}' is reserved`
                            )
                        new FunctionDecl(this, s, this.functions)
                        break
                    case "VariableDeclaration":
                        for (const decl of s.declarations) {
                            this.newDef(decl)
                            if (!this.parseRole(decl)) {
                                new Variable(decl, this.globals)
                            }
                        }
                        break
                }
            } catch (e) {
                this.handleException(s, e)
            }
        }

        this.roles.sort()

        this.withProcedure(this.main, () => {
            this.startDispatchers.callHere()
            for (const s of prog.body) this.emitStmt(s)
            this.writer.emitSync(OpSync.RETURN)
            this.finalizeAutoRefresh()
            this.startDispatchers.finalize()
        })

        function markTopLevel(node: estree.Node) {
            ;(node as any)._jacsIsTopLevel = true
            switch (node.type) {
                case "ExpressionStatement":
                    markTopLevel(node.expression)
                    break
                case "VariableDeclaration":
                    node.declarations.forEach(markTopLevel)
                    break
            }
        }
    }

    private ignore(val: ValueDesc) {}

    private emitExpressionStatement(stmt: estree.ExpressionStatement) {
        this.ignore(this.emitExpr(stmt.expression))
    }

    private emitHandler(
        name: string,
        func: Expr,
        options: { every?: number } = {}
    ): Procedure {
        if (func.type != "ArrowFunctionExpression")
            this.throwError(func, "arrow function expected here")
        const proc = new Procedure(this, name)
        this.withProcedure(proc, wr => {
            if (options.every)
                wr.emitAsync(OpAsync.YIELD, (options.every | 0) + 1)
            if (func.body.type == "BlockStatement") {
                for (const stmt of func.body.body) this.emitStmt(stmt)
            } else {
                this.ignore(this.emitExpr(func.body))
            }
            wr.emitLabel(wr.ret)
            if (options.every) wr.emitJump(wr.top)
            else wr.emitSync(OpSync.RETURN)
        })
        return proc
    }

    private codeName(node: estree.BaseNode) {
        let [a, b] = node.range || []
        if (!b) return ""
        if (b - a > 30) b = a + 30
        return this.source.slice(a, b).replace(/[^a-zA-Z0-9_]+/g, "_")
    }

    private requireArgs(expr: estree.CallExpression, num: number) {
        if (expr.arguments.length != num)
            this.throwError(
                expr,
                `${num} arguments required; got ${expr.arguments.length}`
            )
    }

    private emitInRoleDispatcher(role: Role, f: (wr: OpWriter) => void) {
        const disp = this.roleDispatcher(role)
        this.withProcedure(disp.proc, f)
    }

    private inlineBin(subop: OpBinary, left: ValueDesc, right: ValueDesc) {
        const wr = this.writer
        const l = wr.forceReg(left)
        const r = wr.forceReg(right)
        wr.emitBin(subop, l, r)
        return l
    }

    private requireTopLevel(expr: estree.CallExpression) {
        if (!this.isTopLevel(expr))
            this.throwError(
                expr,
                "this can only be done at the top-level of the program"
            )
    }

    private emitEventCall(
        expr: estree.CallExpression,
        obj: ValueDesc,
        prop: string
    ): ValueDesc {
        const role = obj.cell as Role
        switch (prop) {
            case "sub":
                this.requireTopLevel(expr)
                this.requireArgs(expr, 1)
                const handler = this.emitHandler(
                    this.codeName(expr.callee),
                    expr.arguments[0]
                )
                this.emitInRoleDispatcher(role, wr => {
                    wr.push()
                    const cond = this.inlineBin(
                        OpBinary.EQ,
                        specialVal(ValueSpecial.EV_CODE),
                        floatVal(obj.spec.identifier)
                    )
                    wr.emitIfAndPop(cond, () =>
                        wr.emitCall(handler, OpCall.BG_MAX1_PEND1)
                    )
                })
                return values.zero
            case "wait":
                this.requireArgs(expr, 0)
                const wr = this.writer
                const lbl = wr.mkLabel("wait")
                wr.emitLabel(lbl)
                wr.emitSync(OpSync.OBSERVE_ROLE, role.encode())
                wr.emitAsync(OpAsync.YIELD)
                wr.push()
                const cond = this.inlineBin(
                    OpBinary.EQ,
                    specialVal(ValueSpecial.EV_CODE),
                    floatVal(obj.spec.identifier)
                )
                wr.pop()
                wr.emitJump(lbl, cond.index)
                return values.zero
        }
        this.throwError(expr, `events don't have property ${prop}`)
    }

    private emitCommandCall(
        expr: estree.CallExpression,
        obj: ValueDesc,
        prop: string
    ): ValueDesc {
        const role = obj.cell as Role
        switch (prop) {
            case "sub":
                this.requireTopLevel(expr)
                this.requireArgs(expr, 1)
                const handler = this.emitHandler(
                    this.codeName(expr.callee),
                    expr.arguments[0]
                )
                this.emitInRoleDispatcher(role, wr => {
                    wr.push()
                    const cond = this.inlineBin(
                        OpBinary.EQ,
                        specialVal(ValueSpecial.EV_CODE),
                        floatVal(obj.spec.identifier)
                    )
                    wr.emitIfAndPop(cond, () =>
                        wr.emitCall(handler, OpCall.BG_MAX1_PEND1)
                    )
                })
                return values.zero
            case "wait":
                this.requireArgs(expr, 0)
                const wr = this.writer
                const lbl = wr.mkLabel("wait")
                wr.emitLabel(lbl)
                wr.emitSync(OpSync.OBSERVE_ROLE, role.encode())
                wr.emitAsync(OpAsync.YIELD)
                wr.push()
                const cond = this.inlineBin(
                    OpBinary.EQ,
                    specialVal(ValueSpecial.EV_CODE),
                    floatVal(obj.spec.identifier)
                )
                wr.pop()
                wr.emitJump(lbl, cond.index)
                return values.zero
        }
        this.throwError(expr, `events don't have property ${prop}`)
    }

    private extractRegField(obj: ValueDesc, field: jdspec.PacketMember) {
        const wr = this.writer
        const r = wr.allocReg()
        let off = 0
        for (const f of obj.spec.fields) {
            if (f == field) {
                wr.emitBufOp(OpTop.LOAD_CELL, r, off, field)
                return r
            } else {
                off += Math.abs(f.storage)
            }
        }
        oops("field missing")
    }

    private emitRegGet(
        obj: ValueDesc,
        refresh?: RefreshMS,
        field?: jdspec.PacketMember
    ) {
        if (refresh === undefined)
            refresh =
                obj.spec.kind == "const" ? RefreshMS.Never : RefreshMS.Normal
        if (!field && obj.spec.fields.length == 1) field = obj.spec.fields[0]

        const role = obj.cell as Role
        const wr = this.writer
        wr.emitAsync(
            OpAsync.QUERY_REG,
            role.encode(),
            obj.spec.identifier,
            refresh
        )
        if (field) {
            return this.extractRegField(obj, field)
        } else {
            const r = mkValue(CellKind.JD_VALUE_SEQ, 0, role)
            r.spec = obj.spec
            return r
        }
    }

    private emitIsRoleConnected(role: Role) {
        const wr = this.writer
        const r = wr.allocReg()
        wr.emitLoadCell(
            r,
            CellKind.ROLE_PROPERTY,
            role.index,
            OpRoleProperty.IS_CONNECTED
        )
        return r
    }

    private emitRoleCall(
        expr: estree.CallExpression,
        obj: ValueDesc,
        prop: string
    ): ValueDesc {
        const role = obj.cell as Role
        const wr = this.writer
        if (expr.callee.type != "MemberExpression") oops("")
        switch (prop) {
            case "isConnected":
                this.requireArgs(expr, 0)
                return this.emitIsRoleConnected(role)
            case "onConnected":
            case "onDisconnected":
                this.requireTopLevel(expr)
                this.requireArgs(expr, 1)
                const name = role.getName() + "_" + prop
                const handler = this.emitHandler(name, expr.arguments[0])
                const disp = this.roleDispatcher(role)
                const section =
                    prop == "onConnected" ? disp.connected : disp.disconnected
                section.emit(wr => {
                    wr.emitCall(handler, OpCall.BG_MAX1_PEND1)
                })
                if (prop == "onConnected")
                    disp.init.emit(wr => {
                        wr.push()
                        const r = wr.forceReg(disp.wasConnected.value())
                        wr.emitIfAndPop(r, () => {
                            wr.emitCall(handler, OpCall.BG_MAX1)
                        })
                    })
                return values.zero
            case "wait":
                if (!role.isCondition())
                    this.throwError(expr, "only condition()s have wait()")
                this.requireArgs(expr, 0)
                wr.emitSync(OpSync.OBSERVE_ROLE, role.encode())
                wr.emitAsync(OpAsync.YIELD)
                return values.zero
            default:
                const v = this.emitRoleMember(expr.callee, obj)
                if (v.kind == CellKind.JD_COMMAND) {
                    this.emitPackArgs(expr, v)
                    this.writer.emitAsync(
                        OpAsync.SEND_CMD,
                        role.encode(),
                        v.spec.identifier
                    )
                } else if (v.kind != CellKind.ERROR) {
                    this.throwError(
                        expr,
                        `${stringifyCellKind(v.kind)} can't be called`
                    )
                }
                return values.zero
        }
    }

    private emitPackArgs(expr: estree.CallExpression, obj: ValueDesc) {
        const wr = this.writer
        this.requireArgs(expr, obj.spec.fields.length)
        let off = 0
        let sz = 0
        for (const f of obj.spec.fields) sz += Math.abs(f.storage)
        wr.emitSync(OpSync.SETUP_BUFFER, sz)
        for (let i = 0; i < expr.arguments.length; ++i) {
            wr.push()
            let v = this.emitExpr(expr.arguments[i])
            if (v.kind == CellKind.JD_CURR_BUFFER) {
                if (i != expr.arguments.length - 1)
                    this.throwError(
                        expr.arguments[i + 1],
                        "args can't follow a buffer"
                    )
                wr.pop()
                break
            }
            v = wr.forceReg(v)
            const f = obj.spec.fields[i]
            wr.emitBufOp(OpTop.STORE_CELL, v, off, f)
            off += Math.abs(f.storage)
            assert(off <= sz)
            wr.pop()
        }
    }

    private emitRegisterCall(
        expr: estree.CallExpression,
        obj: ValueDesc,
        prop: string
    ): ValueDesc {
        const role = obj.cell as Role
        assertRange(0, obj.spec.identifier, 0x1ff)

        const wr = this.writer
        switch (prop) {
            case "read":
                this.requireArgs(expr, 0)
                return this.emitRegGet(obj)
            case "write":
                this.emitPackArgs(expr, obj)
                wr.emitAsync(
                    OpAsync.SEND_CMD,
                    role.encode(),
                    obj.spec.identifier | CMD_SET_REG
                )
                return values.zero
            case "onChange":
                this.requireArgs(expr, 2)
                this.requireTopLevel(expr)
                if (obj.spec.fields.length != 1)
                    this.throwError(expr, "wrong register type")
                const threshold = this.litValue(expr.arguments[0])
                const name = role.getName() + "_chg_" + obj.spec.name
                const handler = this.emitHandler(name, expr.arguments[1])
                if (role.autoRefreshRegs.indexOf(obj.spec) < 0)
                    role.autoRefreshRegs.push(obj.spec)
                this.emitInRoleDispatcher(role, wr => {
                    const cache = this.proc.mkTempLocal(name)
                    role.dispatcher.init.emit(wr => {
                        wr.assign(cache.value(), values.nan)
                    })
                    wr.push()
                    const cond = this.inlineBin(
                        OpBinary.EQ,
                        specialVal(ValueSpecial.REG_GET_CODE),
                        floatVal(obj.spec.identifier)
                    )
                    wr.emitIfAndPop(cond, () => {
                        // get the reg value from current packet
                        wr.push()
                        const curr = this.extractRegField(
                            obj,
                            obj.spec.fields[0]
                        )
                        const skipHandler = wr.mkLabel("skipHandler")
                        // if (isNaN(curr)) goto skip (shouldn't really happen unless service is misbehaving)
                        const tmp = wr.allocReg()
                        wr.emitUnary(OpUnary.IS_NAN, tmp, curr)
                        wr.emitUnary(OpUnary.NOT, tmp, tmp)
                        wr.emitJump(skipHandler, tmp.index)
                        // tmp := cache
                        wr.assign(tmp, cache.value())
                        // if (Math.abs(tmp-curr) <= threshold) goto skip
                        // note that this also calls handler() if cache was NaN
                        wr.emitBin(OpBinary.SUB, tmp, curr)
                        wr.emitUnary(OpUnary.ABS, tmp, tmp)
                        const thresholdReg = wr.forceReg(floatVal(threshold))
                        wr.emitBin(OpBinary.LE, tmp, thresholdReg)
                        wr.emitUnary(OpUnary.NOT, tmp, tmp)
                        wr.emitJump(skipHandler, tmp.index)
                        // cache := curr
                        wr.assign(cache.value(), curr)
                        wr.pop()
                        // handler()
                        wr.emitCall(handler, OpCall.BG_MAX1_PEND1)
                        // skip:
                        wr.emitLabel(skipHandler)
                    })
                })
                return values.zero
        }
        this.throwError(expr, `events don't have property ${prop}`)
    }

    private multExpr(v: ValueDesc, scale: number) {
        if (v.kind == CellKind.X_FLOAT) return floatVal(v.index * scale)
        this.writer.emitBin(OpBinary.MUL, v, floatVal(scale))
        return v
    }

    private emitArgs(args: Expr[]) {
        const wr = this.writer
        const tmpargs: number[] = []
        wr.push()
        for (let i = 0; i < args.length; i++) {
            wr.push()
            const r = this.emitSimpleValue(args[i])
            wr.popExcept(r)
            tmpargs.push(r.index)
        }
        wr.pop()

        if (tmpargs.some(idx => idx < args.length))
            this.throwError(args[0], "args register clash")

        const regs = wr.allocArgs(args.length)
        for (let i = 0; i < regs.length; ++i) {
            assert(regs[i].index == i)
            wr.emitMov(i, tmpargs[i])
        }

        return regs
    }

    private litValue(expr: Expr) {
        const tmp = this.emitExpr(expr)
        if (tmp.kind != CellKind.X_FLOAT)
            this.throwError(expr, "number literal expected")
        return tmp.index
    }

    private emitMath(expr: estree.CallExpression, fnName: string): ValueDesc {
        interface Desc {
            m1?: OpMath1
            m2?: OpMath2
            lastArg?: number
            firstArg?: number
            div?: number
        }

        const funs: SMap<Desc> = {
            "Math.floor": { m1: OpMath1.FLOOR },
            "Math.round": { m1: OpMath1.ROUND },
            "Math.ceil": { m1: OpMath1.CEIL },
            "Math.log": { m1: OpMath1.LOG_E },
            "Math.random": { m1: OpMath1.RANDOM, lastArg: 1.0 },
            "Math.max": { m2: OpMath2.MAX },
            "Math.min": { m2: OpMath2.MIN },
            "Math.pow": { m2: OpMath2.POW },
            "Math.sqrt": { m2: OpMath2.POW, lastArg: 1 / 2 },
            "Math.cbrt": { m2: OpMath2.POW, lastArg: 1 / 3 },
            "Math.exp": { m2: OpMath2.POW, firstArg: Math.E },
            "Math.log10": { m1: OpMath1.LOG_E, div: Math.log(10) },
            "Math.log2": { m1: OpMath1.LOG_E, div: Math.log(2) },
            "Math.abs": { m1: OpMath1._LAST },
        }

        const wr = this.writer
        const f = funs[fnName]
        if (!f) return null

        let numArgs = f.m1 !== undefined ? 1 : f.m2 !== undefined ? 2 : NaN
        const origArgs = numArgs
        if (f.firstArg !== undefined) numArgs--
        if (f.lastArg !== undefined) numArgs--
        assert(!isNaN(numArgs))
        this.requireArgs(expr, numArgs)

        if (fnName == "Math.abs") {
            const r = this.emitSimpleValue(expr.arguments[0])
            wr.emitUnary(OpUnary.ABS, r, r)
            return r
        }

        wr.push()
        const args = expr.arguments.slice()
        if (f.firstArg !== undefined) args.unshift(this.mkLiteral(f.firstArg))
        if (f.lastArg !== undefined) args.push(this.mkLiteral(f.lastArg))
        assert(args.length == origArgs)
        const allArgs = this.emitArgs(args)
        if (f.m1 !== undefined) wr.emitSync(OpSync.MATH1, f.m1)
        else wr.emitSync(OpSync.MATH2, f.m2)
        // don't return r0, as this will interfere with nested calls
        const res = wr.allocReg()
        wr.assign(res, allArgs[0])
        wr.popExcept(res)

        if (f.div !== undefined) {
            wr.push()
            const d = this.emitSimpleValue(this.mkLiteral(1 / f.div))
            wr.emitBin(OpBinary.MUL, res, d)
            wr.pop()
        }

        return res
    }

    private emitCallExpression(expr: estree.CallExpression): ValueDesc {
        const wr = this.writer
        const numargs = expr.arguments.length
        if (expr.callee.type == "MemberExpression") {
            const prop = idName(expr.callee.property)
            const objName = idName(expr.callee.object)
            if (objName) {
                const fullName = objName + "." + prop
                const r = this.emitMath(expr, fullName)
                if (r) return r
            }
            const obj = this.emitExpr(expr.callee.object)
            switch (obj.kind) {
                case CellKind.JD_EVENT:
                    return this.emitEventCall(expr, obj, prop)
                case CellKind.JD_REG:
                    return this.emitRegisterCall(expr, obj, prop)
                case CellKind.JD_ROLE:
                    return this.emitRoleCall(expr, obj, prop)
            }
        }

        const funName = idName(expr.callee)
        if (!reservedFunctions[funName]) {
            const d = this.functions.lookup(funName) as FunctionDecl
            if (d) {
                this.requireArgs(expr, d.proc.numargs)
                wr.push()
                this.emitArgs(expr.arguments)
                wr.pop()
                wr.emitCall(d.proc)
                const r = wr.allocReg()
                wr.emitMov(r.index, 0)
                return r
            } else {
                this.throwError(expr, `can't find function '${funName}'`)
            }
        }

        switch (funName) {
            case "wait": {
                this.requireArgs(expr, 1)
                const time = this.litValue(expr.arguments[0]) * 1000
                wr.emitAsync(OpAsync.YIELD, (time | 0) + 1)
                return values.zero
            }
            case "isNaN": {
                this.requireArgs(expr, 1)
                const r = this.emitSimpleValue(expr.arguments[0])
                wr.emitUnary(OpUnary.IS_NAN, r, r)
                return r
            }
            case "reboot": {
                this.requireArgs(expr, 0)
                wr.emitSync(OpSync.PANIC, 0)
                return values.zero
            }
            case "panic": {
                this.requireArgs(expr, 1)
                const code = this.litValue(expr.arguments[0])
                if ((code | 0) != code || code <= 0 || code > 9999)
                    this.throwError(
                        expr,
                        "panic() code must be integer between 1 and 9999"
                    )
                wr.emitSync(OpSync.PANIC, code)
                return values.zero
            }
            case "every": {
                this.requireTopLevel(expr)
                this.requireArgs(expr, 2)
                const time = Math.round(this.litValue(expr.arguments[0]) * 1000)
                if (time < 20)
                    this.throwError(
                        expr,
                        "minimum every() period is 0.02s (20ms)"
                    )
                const proc = this.emitHandler("every", expr.arguments[1], {
                    every: time,
                })
                wr.emitCall(proc, OpCall.BG)
                return values.zero
            }
            case "upload": {
                if (numargs == 0)
                    this.throwError(expr, "upload() requires args")
                wr.push()
                const lbl = this.emitExpr(expr.arguments[0])
                if (lbl.kind != CellKind.JD_CURR_BUFFER)
                    this.throwError(
                        expr.arguments[0],
                        "expecting buffer (string) here; got " +
                            stringifyCellKind(lbl.kind)
                    )
                this.emitArgs(expr.arguments.slice(1))
                wr.pop() // we don't need to save the argument registers
                wr.emitAsync(OpAsync.CLOUD_UPLOAD, numargs - 1)
                return values.zero
            }
            case "print":
            case "format": {
                const arg0 = expr.arguments[0]
                if (arg0?.type != "Literal" || typeof arg0.value != "string")
                    this.throwError(expr, `${funName}() requires string arg`)
                wr.push()
                this.emitArgs(expr.arguments.slice(1))
                const r = wr.allocBuf()
                const fmtString = wr.emitString(arg0.value)
                wr.emitSync(
                    funName == "print" ? OpSync.LOG_FORMAT : OpSync.FORMAT,
                    fmtString.index,
                    numargs - 1
                )
                if (funName == "print") {
                    wr.pop()
                    return values.zero
                } else {
                    wr.popExcept(r)
                    return r
                }
            }
        }
        this.throwError(expr, "unhandled call")
    }

    private emitIdentifier(expr: estree.Identifier): ValueDesc {
        const id = this.forceName(expr)
        if (id == "NaN") return values.nan
        const cell = this.proc.locals.lookup(id)
        if (!cell) this.throwError(expr, "unknown name: " + id)
        return cell.value()
    }

    private matchesSpecName(pi: jdspec.PacketInfo, id: string) {
        return matchesName(pi.name, id)
    }

    private emitRoleMember(expr: estree.MemberExpression, obj: ValueDesc) {
        assert(obj.cell instanceof Role)
        const role = obj.cell as Role
        const propName = this.forceName(expr.property)
        let r: ValueDesc

        let generic: jdspec.PacketInfo
        for (const p of this.sysSpec.packets) {
            if (this.matchesSpecName(p, propName)) generic = p
        }

        for (const p of role.spec.packets) {
            if (
                this.matchesSpecName(p, propName) ||
                (generic?.identifier == p.identifier && generic?.kind == p.kind)
            ) {
                if (isRegister(p)) {
                    assert(!r)
                    r = mkValue(CellKind.JD_REG, p.identifier, role)
                    r.spec = p
                }
                if (isEvent(p)) {
                    assert(!r)
                    r = mkValue(CellKind.JD_EVENT, p.identifier, role)
                    r.spec = p
                }
                if (isCommand(p)) {
                    assert(!r)
                    r = mkValue(CellKind.JD_COMMAND, p.identifier, role)
                    r.spec = p
                }
            }
        }

        if (!r)
            this.throwError(
                expr,
                `role ${role.getName()} has no member ${propName}`
            )
        return r

        function isRegister(pi: jdspec.PacketInfo) {
            return pi.kind == "ro" || pi.kind == "rw" || pi.kind == "const"
        }

        function isEvent(pi: jdspec.PacketInfo) {
            return pi.kind == "event"
        }

        function isCommand(pi: jdspec.PacketInfo) {
            return pi.kind == "command"
        }
    }

    private emitMemberExpression(expr: estree.MemberExpression): ValueDesc {
        if (idName(expr.object) == "Math") {
            const id = idName(expr.property)
            if (mathConst.hasOwnProperty(id)) return floatVal(mathConst[id])
        }
        const obj = this.emitExpr(expr.object)
        if (obj.kind == CellKind.JD_ROLE) {
            return this.emitRoleMember(expr, obj)
        } else if (obj.kind == CellKind.JD_REG) {
            const propName = this.forceName(expr.property)
            if (obj.spec.fields.length > 1) {
                const fld = obj.spec.fields.find(f =>
                    matchesName(f.name, propName)
                )
                if (!fld)
                    this.throwError(
                        expr,
                        `no field ${propName} in ${obj.spec.name}`
                    )
                return this.emitRegGet(obj, undefined, fld)
            } else {
                this.throwError(
                    expr,
                    `unhandled member ${propName}; use .read()`
                )
            }
        }

        this.throwError(expr, `unhandled member ${idName(expr.property)}`)
    }

    private mkLiteral(v: number): estree.Literal {
        return {
            type: "Literal",
            value: v,
        }
    }

    private emitLiteral(expr: estree.Literal): ValueDesc {
        let v = expr.value
        if (v === true) v = 1
        else if (v === false) v = 0
        else if (v === null || v === undefined) v = 0

        const wr = this.writer

        if (typeof v == "string") {
            const r = wr.allocBuf()
            const vd = wr.emitString(v)
            wr.emitSync(OpSync.MEMCPY, vd.index)
            return r
        }

        if (typeof v == "number") return floatVal(v)
        this.throwError(expr, "unhandled literal: " + v)
    }

    private lookupCell(expr: estree.Expression | estree.Pattern) {
        const name = this.forceName(expr)
        const r = this.proc.locals.lookup(name)
        if (!r) this.throwError(expr, `can't find '${name}'`)
        return r
    }

    private lookupVar(expr: estree.Expression | estree.Pattern) {
        const r = this.lookupCell(expr)
        if (!(r instanceof Variable))
            this.throwError(expr, "expecting variable")
        return r
    }

    private emitSimpleValue(expr: Expr) {
        const val = this.emitExpr(expr)
        this.requireRuntimeValue(expr, val)
        return this.writer.forceReg(val)
    }

    private requireRuntimeValue(node: estree.BaseNode, v: ValueDesc) {
        switch (v.kind) {
            case CellKind.X_FP_REG:
            case CellKind.LOCAL:
            case CellKind.GLOBAL:
            case CellKind.FLOAT_CONST:
            case CellKind.IDENTITY:
            case CellKind.X_FLOAT:
            case CellKind.SPECIAL:
                break
            default:
                this.throwError(node, "a number required here")
        }
    }

    private emitAssignmentExpression(
        expr: estree.AssignmentExpression
    ): ValueDesc {
        const src = this.emitExpr(expr.right)
        const wr = this.writer
        let left = expr.left
        if (left.type == "ArrayPattern") {
            if (src.kind == CellKind.JD_VALUE_SEQ) {
                let off = 0
                wr.push()
                const tmpreg = wr.allocReg()
                for (let i = 0; i < left.elements.length; ++i) {
                    const pat = left.elements[i]
                    const f = src.spec.fields[i]
                    if (!f)
                        this.throwError(
                            pat,
                            `not enough fields in ${src.spec.name}`
                        )
                    wr.emitBufOp(OpTop.LOAD_CELL, tmpreg, off, f)
                    off += Math.abs(f.storage)
                    this.emitStore(this.lookupVar(pat), tmpreg)
                }
                wr.pop()
            } else {
                this.throwError(expr, "expecting a multi-field register read")
            }
            return src
        } else if (left.type == "Identifier") {
            this.requireRuntimeValue(expr.right, src)
            this.emitStore(this.lookupVar(left), src)
            return src
        }
        this.throwError(expr, "unhandled assignment")
    }

    private emitBinaryExpression(
        expr: estree.BinaryExpression | estree.LogicalExpression
    ): ValueDesc {
        const simpleOps: SMap<OpBinary> = {
            "+": OpBinary.ADD,
            "-": OpBinary.SUB,
            "/": OpBinary.DIV,
            "*": OpBinary.MUL,
            "<": OpBinary.LT,
            "<=": OpBinary.LE,
            "==": OpBinary.EQ,
            "===": OpBinary.EQ,
            "!=": OpBinary.NE,
            "!==": OpBinary.NE,
            "&&": OpBinary.AND,
            "||": OpBinary.OR,
        }

        let op = expr.operator

        if (op == "**")
            return this.emitMath(
                {
                    type: "CallExpression",
                    range: expr.range,
                    callee: null,
                    optional: false,
                    arguments: [expr.left, expr.right],
                },
                "Math.pow"
            )

        let swap = false
        if (op == ">") {
            op = "<"
            swap = true
        }
        if (op == ">=") {
            op = "<="
            swap = true
        }

        const op2 = simpleOps[op]
        if (op2 === undefined) this.throwError(expr, "unhandled operator")

        const wr = this.writer

        wr.push()
        let a = this.emitSimpleValue(expr.left)
        let b = this.emitSimpleValue(expr.right)
        if (swap) [a, b] = [b, a]
        wr.emitBin(op2, a, b)
        wr.popExcept(a)

        return a
    }

    private emitUnaryExpression(expr: estree.UnaryExpression): ValueDesc {
        const simpleOps: SMap<OpUnary> = {
            "!": OpUnary.NOT,
            "-": OpUnary.NEG,
            "+": OpUnary.ID,
        }

        const op = simpleOps[expr.operator]
        if (op === undefined) this.throwError(expr, "unhandled operator")

        const wr = this.writer

        wr.push()
        const a = this.emitSimpleValue(expr.argument)
        wr.emitUnary(op, a, a)
        wr.popExcept(a)

        return a
    }

    private emitExpr(expr: Expr): ValueDesc {
        switch (expr.type) {
            case "CallExpression":
                return this.emitCallExpression(expr)
            case "Identifier":
                return this.emitIdentifier(expr)
            case "MemberExpression":
                return this.emitMemberExpression(expr)
            case "Literal":
                return this.emitLiteral(expr)
            case "AssignmentExpression":
                return this.emitAssignmentExpression(expr)
            case "LogicalExpression":
            case "BinaryExpression":
                return this.emitBinaryExpression(expr)
            case "UnaryExpression":
                return this.emitUnaryExpression(expr)
            default:
                console.log(expr)
                return this.throwError(expr, "unhandled expr: " + expr.type)
        }
    }

    private sourceFrag(range: number[]) {
        if (range) {
            let [startp, endp] = range
            if (endp === undefined) endp = startp + 60
            endp = Math.min(endp, startp + 60)
            return this.source.slice(startp, endp).replace(/\n[^]*/, "...")
        }

        return null
    }

    private handleException(stmt: estree.BaseNode, e: any) {
        if (e.sourceNode !== undefined) {
            const node = e.sourceNode || stmt
            this.reportError(node.range, e.message)
        } else {
            this.reportError(stmt.range, "Internal error: " + e.message)
            console.log(e.stack)
        }
    }

    private emitStmt(stmt: Stmt) {
        const src = this.sourceFrag(stmt.range)
        const wr = this.writer
        if (src) wr.emitComment(src)

        wr.stmtStart(this.indexToLine(stmt.range[0]))

        const scopes = wr.numScopes()
        wr.push()
        try {
            switch (stmt.type) {
                case "ExpressionStatement":
                    return this.emitExpressionStatement(stmt)
                case "VariableDeclaration":
                    return this.emitVariableDeclaration(stmt)
                case "IfStatement":
                    return this.emitIfStatement(stmt)
                case "BlockStatement":
                    stmt.body.forEach(s => this.emitStmt(s))
                    return
                case "ReturnStatement":
                    return this.emitReturnStatement(stmt)
                case "FunctionDeclaration":
                    return this.emitFunctionDeclaration(stmt)
                default:
                    console.log(stmt)
                    this.throwError(stmt, `unhandled type: ${stmt.type}`)
            }
        } catch (e) {
            this.handleException(stmt, e)
        } finally {
            wr.pop()
            wr.stmtEnd()
            if (wr.numScopes() != scopes) {
                if (!this.numErrors)
                    this.throwError(stmt, "push/pop mismatch; " + stmt.type)
                while (wr.numScopes() > scopes) wr.pop()
            }
        }
    }

    private assertLittleEndian() {
        const test = new Uint16Array([0xd042])
        assert(toHex(new Uint8Array(test.buffer)) == "42d0")
    }

    private serialize() {
        // serialization only works on little endian machines
        this.assertLittleEndian()

        const fixHeader = new SectionWriter(BinFmt.FixHeaderSize)
        const sectDescs = new SectionWriter()
        const sections: SectionWriter[] = [fixHeader, sectDescs]

        const hd = new Uint8Array(BinFmt.FixHeaderSize)
        hd.set(
            jdpack("u32 u32 u16", [
                BinFmt.Magic0,
                BinFmt.Magic1,
                this.globals.list.length,
            ])
        )
        fixHeader.append(hd)

        const funDesc = new SectionWriter()
        const funData = new SectionWriter()
        const floatData = new SectionWriter()
        const roleData = new SectionWriter()
        const strDesc = new SectionWriter()
        const strData = new SectionWriter()

        for (const s of [
            funDesc,
            funData,
            floatData,
            roleData,
            strDesc,
            strData,
        ]) {
            sectDescs.append(s.desc)
            sections.push(s)
        }

        funDesc.size = BinFmt.FunctionHeaderSize * this.procs.length

        for (const proc of this.procs) {
            funDesc.append(proc.writer.desc)
            proc.writer.offsetInFuncs = funData.currSize
            funData.append(proc.writer.serialize())
        }

        floatData.append(
            new Uint8Array(new Float64Array(this.floatLiterals).buffer)
        )

        for (const r of this.roles.list) {
            roleData.append((r as Role).serialize())
        }

        const descs = this.stringLiterals.map(str => {
            const buf = stringToUint8Array(toUTF8(str) + "\u0000")
            const desc = new Uint8Array(8)
            write32(desc, 0, strData.currSize) // initially use offsets in strData section
            write32(desc, 4, buf.length - 1)
            strData.append(buf)
            strDesc.append(desc)
            return desc
        })
        strData.align()

        let off = 0
        for (const s of sections) {
            s.finalize(off)
            off += s.size
        }
        const outp = new Uint8Array(off)

        // shift offsets from strData-local to global
        for (const d of descs) {
            write32(d, 0, read32(d, 0) + strData.offset)
        }

        for (const proc of this.procs) {
            proc.writer.finalizeDesc(funData.offset + proc.writer.offsetInFuncs)
        }

        off = 0
        for (const s of sections) {
            for (const d of s.data) {
                outp.set(d, off)
                off += d.length
            }
        }
        assert(off == outp.length)

        return outp
    }

    emit() {
        try {
            this.tree = esprima.parseScript(this.source, {
                // tolerant: true,
                range: true,
            })
        } catch (e) {
            if (e.description) this.reportError([e.index], e.description)
            else throw e
            return
        }

        this.emitProgram(this.tree)

        this.finalizeDispatchers()
        for (const p of this.procs) p.finalize()

        if (this.numErrors == 0)
            this.host.write(
                "prog.jasm",
                this.procs.map(p => p.toString()).join("\n")
            )

        const b = this.serialize()
        const dbg: DebugInfo = {
            roles: this.roles.list.map(r => r.debugInfo()),
            functions: this.procs.map(p => p.writer.debugInfo()),
            globals: this.globals.list.map(r => r.debugInfo()),
            source: this.source,
        }
        this.host.write("prog.jacs", b)
        this.host.write("prog-dbg.json", JSON.stringify(dbg))
        if (this.numErrors == 0) verifyBinary(this.host, b, dbg)

        return {
            success: this.numErrors == 0,
            binary: b,
            dbg: dbg,
        }
    }
}

export function compile(host: Host, code: string) {
    const p = new Program(host, code)
    return p.emit()
}

export function testCompiler(code: string) {
    const lines = code.split(/\r?\n/).map(s => {
        const m = /\/\/\s*!\s*(.*)/.exec(s)
        if (m) return m[1]
        else return null
    })
    const numerr = lines.filter(s => !!s).length
    let numExtra = 0
    const p = new Program(
        {
            write: () => {},
            log: msg => {},
            error: err => {
                const exp = lines[err.line - 1]
                if (exp && err.message.indexOf(exp) >= 0)
                    lines[err.line - 1] = null
                else {
                    numExtra++
                    printJacError(err)
                }
            },
        },
        code
    )
    const r = p.emit()
    let missingErrs = 0
    for (let i = 0; i < lines.length; ++i) {
        if (lines[i]) {
            printJacError({
                line: i + 1,
                column: 1,
                message: "missing error: " + lines[i],
                codeFragment: "",
            })
            missingErrs++
        }
    }
    if (missingErrs) throw new Error("some errors were not reported")
    if (numExtra) throw new Error("extra errors reported")
    if (numerr && r.success) throw new Error("unexpected success")
}

import * as esprima from "esprima"

import * as estree from "estree"
import { range } from "../jdom/utils"
import { serviceSpecificationFromName } from "../jdom/spec"

/*

- FORMAT should maybe set the buffer size?
- save registers before context switch
- add role observers
- get_reg option to return immediately

*/

export interface SMap<T> {
    [k: string]: T
}

export const NUM_REGS = 16

export enum OpTop {
    SET_A = 0, // ARG[12]
    SET_B = 1, // ARG[12]
    SET_C = 2, // ARG[12]
    SET_D = 3, // ARG[12]
    SET_HIGH = 4, // A/B/C/D[2] ARG[10]

    UNARY = 5, // OP[4] DST[4] SRC[4]
    BINARY = 6, // OP[4] DST[4] SRC[4]

    LOAD_CELL = 7, // DST[4] A:OP[2] B:OFF[6]
    STORE_CELL = 8, // SRC[4] A:OP[2] B:OFF[6]

    JUMP = 9, // REG[4] BACK[1] IF_ZERO[1] B:OFF[6]
    CALL = 10, // NUMREGS[4] BG[1] 0[1] B:OFF[6]

    SYNC = 11, // A:ARG[4] OP[8]
    ASYNC = 12, // D:SAVE_REGS[4] OP[8]
}

export enum OpAsync {
    YIELD, // A-timeout in ms
    CLOUD_UPLOAD, // A-numregs
    QUERY_REG, // A-role, B-code, C-timeout
    SET_REG, // A-role, B-code
    _LAST,
}

export enum OpSync {
    RETURN,
    SETUP_BUFFER, // A-size
    OBSERVE_ROLE, // A-role
    FORMAT, // A-string-index B-numargs
    MEMCPY, // A-string-index
    _LAST,
}

export enum CellKind {
    LOCAL = 0,
    GLOBAL = 1,
    FLOAT_CONST = 2,
    IDENTITY = 3,

    BUFFER = 4, // arg=shift:numfmt, C=Offset
    SPECIAL = 5, // arg=nan, regcode, role, ...

    // these cannot be emitted directly
    JD_EVENT = 0x100,
    JD_REG = 0x101,
    JD_ROLE = 0x102,
    JD_VALUE_SEQ = 0x103,
    JD_CURR_BUFFER = 0x104,
    X_STRING = 0x105,
    X_FP_REG = 0x106,
    X_FLOAT = 0x107,

    ERROR = 0x200,
}

export enum ValueSpecial {
    NAN = 0x0,
    // jd_packet accessors:
    SIZE = 0x1,
    EV_CODE = 0x2, // or nan
    REG_CODE = 0x3, // or nan
    ROLE_ID = 0x4, // or nan
}

export enum OpBinary {
    ADD = 0x1,
    SUB = 0x2,
    DIV = 0x3,
    MUL = 0x4,
    LT = 0x5,
    LE = 0x6,
    EQ = 0x7,
    NE = 0x8,
    AND = 0x9,
    OR = 0xa,
}

export enum OpUnary {
    ID = 0x0,
    NEG = 0x1,
    NOT = 0x2,
}

// Size in bits is: 8 << (fmt & 0b11)
// Format is ["u", "i", "f", "reserved"](fmt >> 2)
export enum OpFmt {
    U8 = 0b0000,
    U16 = 0b0001,
    U32 = 0b0010,
    U64 = 0b0011,
    I8 = 0b0100,
    I16 = 0b0101,
    I32 = 0b0110,
    I64 = 0b0111,
    F32 = 0b1010,
    F64 = 0b1011,
}

const sample = `
var btnA = roles.button()
var color = roles.color()
var led = roles.lightBulb()
var display = roles.characterScreen()
var r, g, b, tint

btnA.down.sub(() => {
  led.brightness.write(1)
  wait(0.1);
  [r, g, b] = color.reading.read()
  tint = (r + g + 2 * b) / (r + g + b)
  upload("color", r, g, b, tint)
  display.message.write(format("t={0} {1}", tint, r))
  led.brightness.write(0)
})
`

export function stringifyCellKind(vk: CellKind) {
    switch (vk) {
        case CellKind.X_FP_REG:
            return "(reg)"
        case CellKind.LOCAL:
            return "local variable"
        case CellKind.GLOBAL:
            return "global variable"
        case CellKind.FLOAT_CONST:
            return "float literal"
        case CellKind.IDENTITY:
            return "small int literal"
        case CellKind.SPECIAL:
            return "special value"
        case CellKind.BUFFER:
            return "buffer access"
        case CellKind.JD_VALUE_SEQ:
            return "multi-field buffer"
        case CellKind.JD_CURR_BUFFER:
            return "current buffer"
        case CellKind.X_STRING:
            return "string literal"
        case CellKind.X_FLOAT:
            return "float literal (generic)"
        case CellKind.JD_EVENT:
            return "Jacdac event"
        case CellKind.JD_REG:
            return "Jacdac register"
        case CellKind.JD_ROLE:
            return "Jacdac role"
        case CellKind.ERROR:
            return "(error node)"
        default:
            return "ValueKind: 0x" + (vk as number).toString(16)
    }
}

export interface InstrArgResolver {
    describeCell(t: CellKind, idx: number): string
    funName(idx: number): string
    roleName(idx: number): string
    resolverParams: number[]
}

export function bitSize(fmt: OpFmt) {
    return 8 << (fmt & 0b11)
}

export function stringifyInstr(instr: number, resolver?: InstrArgResolver) {
    const op = instr >>> 12
    const arg12 = instr & 0xfff
    const arg10 = instr & 0x3ff
    const arg8 = instr & 0xff
    const arg6 = instr & 0x3f
    const arg4 = instr & 0xf
    const subop = arg12 >> 8

    const reg0 = `R${subop}`
    const reg1 = `R${arg8 >> 4}`
    const reg2 = `R${arg4}`

    const abcd = ["A", "B", "C", "D"]

    let params: number[] = [0, 0, 0, 0]

    if (resolver?.resolverParams) params = resolver.resolverParams

    let [a, b, c, d] = params

    const res = doOp()

    if (op > OpTop.SET_HIGH) a = b = c = d = 0
    if (resolver) resolver.resolverParams = [a, b, c, d]

    return res

    function doOp() {
        switch (op) {
            case OpTop.SET_A: // ARG[12]
            case OpTop.SET_B: // ARG[12]
            case OpTop.SET_C: // ARG[12]
            case OpTop.SET_D: // ARG[12]
                params[op] = arg12
                return `set ${abcd[op]} to ${arg12}`

            case OpTop.SET_HIGH: // A/B/C/D[2] ARG[10]
                params[arg12 >> 10] |= arg10 << 12
                return `set upper ${abcd[arg12 >> 10]} to ${arg10}`

            case OpTop.UNARY: // OP[4] DST[4] SRC[4]
                return `${reg1} := ${uncode()} ${reg2}`

            case OpTop.BINARY: // OP[4] DST[4] SRC[4]
                return `${reg1} := ${reg1} ${bincode()} ${reg2}`

            case OpTop.LOAD_CELL: // DST[4] A:OP[2] B:OFF[6]
            case OpTop.STORE_CELL: // SRC[4] A:OP[2] B:OFF[6]
                a = (a << 2) | (arg8 >> 6)
                b = (b << 6) | arg6
                return op == OpTop.LOAD_CELL
                    ? `${reg0} := ${celldesc()}`
                    : `${celldesc()} := ${reg0}`

            case OpTop.JUMP: // REG[4] BACK[1] IF_ZERO[1] B:OFF[6]
                b = (b << 6) | arg6
                return (
                    `jump ${arg8 << (1 << 7) ? "-" : "+"}${b}` +
                    (arg8 << (1 << 6) ? ` if ${reg0} == 0` : ``)
                )

            case OpTop.CALL: // NUMREGS[4] BG[1] 0[1] B:OFF[6]
                b = (b << 6) | arg6
                return `call${arg8 << (1 << 7) ? " bg" : ""} ${resolver.funName(
                    b
                )}_F${b} #${subop}`

            case OpTop.SYNC: // A:ARG[4] OP[8]
                a = (a << 4) | subop
                return `sync ${arg8} a=${a}`

            case OpTop.ASYNC: // D:SAVE_REGS[4] OP[8]
                d = (d << 4) | subop
                return `async ${arg8} save=${a.toString(2)}`
        }
    }

    function jdreg() {
        return `${role()}.reg_0x${b.toString(16)}`
    }

    function role() {
        return (resolver?.roleName(a) || "") + "_r" + a
    }

    function numfmt(v: number) {
        const fmt = v & 0xf
        const bitsz = bitSize(fmt)
        const letter = ["u", "i", "f", "x"][fmt >> 2]
        const shift = v >> 4
        if (shift) return letter + (bitsz - shift) + "." + shift
        else return letter + bitsz
    }

    function uncode() {
        switch (subop) {
            case OpUnary.ID:
                return ""
            case OpUnary.NEG:
                return "-"
            case OpUnary.NOT:
                return "!"
            default:
                return "un-" + subop
        }
    }
    function bincode() {
        switch (subop) {
            case OpBinary.ADD:
                return "+"
            case OpBinary.SUB:
                return "-"
            case OpBinary.DIV:
                return "/"
            case OpBinary.MUL:
                return "*"
            case OpBinary.LT:
                return "<"
            case OpBinary.LE:
                return "<="
            case OpBinary.EQ:
                return "=="
            case OpBinary.NE:
                return "!="
            case OpBinary.AND:
                return "&&"
            case OpBinary.OR:
                return "||"
            default:
                return "bin-" + subop
        }
    }
    function celldesc() {
        const idx = b
        const r = resolver?.describeCell(a, b) || ""
        switch (a) {
            case CellKind.LOCAL:
                return `${r}_L${idx}`
            case CellKind.GLOBAL:
                return `${r}_G${idx}`
            case CellKind.FLOAT_CONST:
                return `${r}_F${idx}`
            case CellKind.IDENTITY:
                return `${idx}`
            case CellKind.BUFFER:
                return `buf[${c} @ ${numfmt(idx)}]`
            case CellKind.SPECIAL:
                switch (idx) {
                    case ValueSpecial.NAN:
                        return "NAN"
                    case ValueSpecial.SIZE:
                        return "SIZE"
                    case ValueSpecial.EV_CODE:
                        return "EV_CODE"
                    case ValueSpecial.REG_CODE:
                        return "REG_CODE"
                    default:
                        return `${r}_SPEC[${idx}]`
                }
            default:
                return `C${a}[$idx]` // ??
        }
    }
}

class Cell {
    index: number
    constructor(
        public definition: estree.VariableDeclarator,
        public scope: VariableScope
    ) {
        scope.add(this)
    }
    value(): ValueDesc {
        oops("on value() on generic Cell")
    }
    getName() {
        return idName(this.definition.id)
    }
}

class Role extends Cell {
    dispatcher: Procedure

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
}

class Variable extends Cell {
    isLocal = false

    constructor(definition: estree.VariableDeclarator, scope: VariableScope) {
        super(definition, scope)
    }
    value(): ValueDesc {
        const kind = this.isLocal ? CellKind.LOCAL : CellKind.GLOBAL
        return mkValue(kind, this.index, this)
    }
}

interface ValueDesc {
    kind: CellKind
    index: number
    cell?: Cell
    spec?: jdspec.PacketInfo
    litValue?: number
}

function oops(msg: string): never {
    throw new Error(msg)
}

function assert(cond: boolean, msg = "") {
    if (!cond) oops("assertion failed" + (msg ? ": " + msg : ""))
}

function assertRange(min: number, v: number, max: number, desc = "value") {
    if (min <= v && v <= max) return
    oops(`${desc}=${v} out of range [${min}, ${max}]`)
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

const values = {
    zero: floatVal(0),
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
    private assembly: (string | number)[] = []
    private assemblyPtr = 0

    constructor(public parent: Procedure) {
        this.top = this.mkLabel("top")
        this.emitLabel(this.top)
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
                `register ${regno} already allocated`
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

    isWritable(v: ValueDesc) {
        return (
            this.isReg(v) ||
            v.kind == CellKind.LOCAL ||
            v.kind == CellKind.GLOBAL
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
            if (high) {
                assert(high >> 4 == 0)
                this.emitRaw(OpTop.SET_HIGH, (i << 10) | high)
            }
            this.emitRaw(OpTop.SET_A + i, v & 0xfff)
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

    emitAsync(op: OpAsync, a: number = 0, b: number = 0, c: number = 0) {
        const d = this.allocatedRegsMask & 0xffff
        this.emitPrefix(a, b, c, d >> 4)
        assertRange(0, op, OpAsync._LAST)
        this.emitRaw(OpTop.ASYNC, ((d & 0xf) << 8) | op)
    }

    private emitMov(dst: number, src: number) {
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

    emitLoadCell(dst: ValueDesc, celltype: CellKind, idx: number) {
        assert(this.isReg(dst))
        switch (celltype) {
            case CellKind.LOCAL:
            case CellKind.GLOBAL:
            case CellKind.FLOAT_CONST:
            case CellKind.IDENTITY:
            case CellKind.BUFFER:
            case CellKind.SPECIAL:
                this.emitLoadStoreCell(OpTop.LOAD_CELL, dst, celltype, idx)
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
                this.emitLoadStoreCell(OpTop.STORE_CELL, src, celltype, idx)
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
        argC = 0
    ) {
        assert(this.isReg(dst))
        const [a, b] = [celltype, idx]
        this.emitPrefix(a >> 2, b >> 6, argC)
        // DST[4] A:OP[2] B:OFF[6]
        this.emitRaw(
            op,
            (dst.index << 8) | ((celltype & 0x3) << 6) | (idx & 0x3f)
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
            else r += stringifyInstr(this.binary[ln], this.parent.parent) + "\n"
        }
        return r
    }

    emitComment(msg: string) {
        this.writeAsm("; " + msg.replace(/\n/g, "\n; "))
    }

    emitInstr(v: number) {
        v >>>= 0
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

    emitIf(
        subop: OpBinary,
        left: ValueDesc,
        right: ValueDesc,
        thenBody: () => void,
        elseBody?: () => void
    ) {
        if (elseBody) {
            const endIf = this.mkLabel("endif")
            const elseIf = this.mkLabel("elseif")
            this.emitJumpIfFalse(elseIf, subop, left, right)
            thenBody()
            this.emitJump(endIf)
            this.emitLabel(elseIf)
            elseBody()
            this.emitLabel(endIf)
        } else {
            const skipIf = this.mkLabel("skipif")
            this.emitJumpIfFalse(skipIf, subop, left, right)
            thenBody()
            this.emitLabel(skipIf)
        }
    }

    emitJumpIfFalse(
        label: Label,
        subop: OpBinary,
        left: ValueDesc,
        right: ValueDesc
    ) {
        this.push()
        const l = this.forceReg(left)
        const r = this.forceReg(right)
        this.emitBin(subop, l, r)
        this.emitJump(label, l.index)
        this.pop()
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
            assert(l.offset != -1)
            for (const u of l.uses) {
                let op0 = this.binary[u]
                let op1 = this.binary[u + 1]
                assert(op0 >> 12 == OpTop.SET_B)
                assert(op1 >> 12 == OpTop.JUMP)
                let off = l.offset - u
                assert(off != 0)
                if (off < 0) {
                    off = -off
                    op1 |= 1 << 7
                }
                assert((op0 & 0xfff) == 0)
                assert((op1 & 0x3f) == 0)
                off -= 1
                assertRange(0, off, 0x3ffff)
                op0 |= off >> 6
                op1 |= off & 0x3f
                this.binary[u] = op0 >>> 0
                this.binary[u + 1] = op1 >>> 0
            }
        }
    }

    emitCall(proc: Procedure, isBg = false) {
        this.emitPrefix(proc.index >> 6)
        this.emitRaw(
            OpTop.CALL,
            (proc.numargs << 8) | (isBg ? 1 << 7 : 0) | (proc.index & 0x3f)
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

class Procedure {
    writer = new OpWriter(this)
    index: number
    numargs = 0
    constructor(public parent: Program, public name: string) {
        this.index = this.parent.procs.length
        this.parent.procs.push(this)
    }
    toString() {
        return `proc ${this.name}:\n${this.writer.getAssembly()}`
    }
    finalize() {
        this.writer.patchLabels()
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
        this.map[cell.getName()] = cell
    }

    describeIndex(idx: number) {
        const v = this.list[idx]
        if (v) return v.getName()
        return undefined
    }
}

enum RefreshMS {
    Never = 0,
    Normal = 500,
}

type Expr = estree.Expression | estree.Super | estree.SpreadElement

class Program implements InstrArgResolver {
    roles = new VariableScope(null)
    globals = new VariableScope(this.roles)
    locals = new VariableScope(this.globals)
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

    constructor(public source: string) {}

    indexToPos(idx: number) {
        const s = this.source.slice(0, idx)
        const ln = s.replace(/[^\n]/g, "").length + 1
        const col = s.replace(/.*\n/, "").length + 1
        return `(${ln},${col})`
    }

    throwError(expr: estree.BaseNode, msg: string): never {
        const err = new Error(msg)
        ;(err as any).sourceNode = expr
        throw err
    }

    reportError(range: number[], msg: string): ValueDesc {
        console.error(
            `${this.indexToPos(range[0])}: ${msg} (${this.sourceFrag(range)})`
        )
        return values.error
    }

    describeCell(t: CellKind, idx: number): string {
        switch (t) {
            case CellKind.LOCAL:
                return this.locals.describeIndex(idx)
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
        return undefined
    }

    roleName(idx: number): string {
        return this.roles.describeIndex(idx)
    }

    private roleDispatcher(r: Role) {
        if (!r.dispatcher) {
            r.dispatcher = new Procedure(this, r.getName() + "_disp")
            this.withProcedure(r.dispatcher, () => {
                this.writer.emitSync(OpSync.OBSERVE_ROLE, r.encode())
                this.writer.emitAsync(OpAsync.YIELD)
            })
        }
        return r.dispatcher
    }

    private finalizeDispatchers() {
        for (const r of this.roles.list) {
            const disp = (r as Role).dispatcher
            if (disp)
                // forever!
                this.withProcedure(disp, wr => {
                    wr.emitJump(wr.top)
                })
        }
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

    private forceName(pat: estree.Expression | estree.Pattern) {
        const r = idName(pat)
        if (!r) this.throwError(pat, "only simple identifiers supported")
        return (pat as estree.Identifier).name
    }

    private parseRole(decl: estree.VariableDeclarator) {
        const expr = decl.init
        if (expr?.type != "CallExpression") return null
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

    private emitVariableDeclaration(decls: estree.VariableDeclaration) {
        if (decls.kind != "var") this.throwError(decls, "only 'var' supported")
        for (const decl of decls.declarations) {
            const id = this.forceName(decl.id)
            const r = this.parseRole(decl)
            if (!r) {
                const g = new Variable(decl, this.globals)
                this.writer.push()
                this.emitStore(
                    g,
                    decl.init ? this.emitSimpleValue(decl.init) : values.zero
                )
                this.writer.pop()
            }
        }
    }

    private emitProgram(prog: estree.Program) {
        const main = new Procedure(this, "main")
        this.withProcedure(main, () => {
            for (const s of prog.body) this.emitStmt(s)
        })
    }

    private ignore(val: ValueDesc) {}

    private emitExpressionStatement(stmt: estree.ExpressionStatement) {
        this.ignore(this.emitExpr(stmt.expression))
    }

    private emitHandler(
        name: string,
        func: estree.ArrowFunctionExpression
    ): Procedure {
        const proc = new Procedure(this, name)
        this.withProcedure(proc, wr => {
            if (func.body.type == "BlockStatement") {
                for (const stmt of func.body.body) this.emitStmt(stmt)
            } else {
                this.ignore(this.emitExpr(func.body))
            }
            wr.emitSync(OpSync.RETURN)
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

    private emitEventCall(
        expr: estree.CallExpression,
        obj: ValueDesc,
        prop: string
    ): ValueDesc {
        const role = obj.cell as Role
        switch (prop) {
            case "sub":
                if (
                    expr.arguments.length != 1 ||
                    expr.arguments[0].type != "ArrowFunctionExpression"
                )
                    this.throwError(expr, ".sub() requires a single handler")
                const handler = this.emitHandler(
                    this.codeName(expr.callee),
                    expr.arguments[0]
                )
                this.withProcedure(this.roleDispatcher(role), wr => {
                    wr.emitIf(
                        OpBinary.EQ,
                        specialVal(ValueSpecial.EV_CODE),
                        floatVal(obj.spec.identifier),
                        () => {
                            wr.emitCall(handler)
                        }
                    )
                })
                return values.zero
        }
        this.throwError(expr, `events don't have property ${prop}`)
    }

    private emitRegisterCall(
        expr: estree.CallExpression,
        obj: ValueDesc,
        prop: string
    ): ValueDesc {
        const role = obj.cell as Role
        assertRange(0, obj.spec.identifier, 0x1ff)
        const refresh =
            obj.spec.kind == "const" ? RefreshMS.Never : RefreshMS.Normal
        const wr = this.writer
        switch (prop) {
            case "read":
                this.requireArgs(expr, 0)
                wr.emitAsync(
                    OpAsync.QUERY_REG,
                    role.encode(),
                    obj.spec.identifier,
                    refresh
                )
                if (obj.spec.fields.length == 1) {
                    const r = wr.allocReg()
                    wr.emitBufOp(OpTop.LOAD_CELL, r, 0, obj.spec.fields[0])
                    return r
                } else {
                    const r = mkValue(CellKind.JD_VALUE_SEQ, 0, role)
                    r.spec = obj.spec
                    return r
                }
            case "write":
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
                        break
                    }
                    v = wr.forceReg(v)
                    const f = obj.spec.fields[i]
                    wr.emitBufOp(OpTop.STORE_CELL, v, off, f)
                    off += Math.abs(f.storage)
                    assert(off <= sz)
                    wr.pop()
                }
                wr.emitAsync(
                    OpAsync.SET_REG,
                    role.encode(),
                    obj.spec.identifier
                )
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
        const regs = wr.allocArgs(args.length)
        for (let i = 0; i < args.length; i++) {
            wr.push()
            wr.assign(regs[i], this.emitExpr(args[i]))
            wr.pop()
        }
    }

    private litValue(expr: Expr) {
        const tmp = this.emitExpr(expr)
        if (tmp.kind != CellKind.X_FLOAT)
            this.throwError(expr, "number literal expected")
        return tmp.index
    }

    private emitCallExpression(expr: estree.CallExpression): ValueDesc {
        const wr = this.writer
        const numargs = expr.arguments.length
        if (expr.callee.type == "MemberExpression") {
            const prop = idName(expr.callee.property)
            const obj = this.emitExpr(expr.callee.object)
            switch (obj.kind) {
                case CellKind.JD_EVENT:
                    return this.emitEventCall(expr, obj, prop)
                case CellKind.JD_REG:
                    return this.emitRegisterCall(expr, obj, prop)
            }
        }
        switch (idName(expr.callee)) {
            case "wait": {
                this.requireArgs(expr, 1)
                const time = this.litValue(expr.arguments[0]) * 1000
                wr.emitAsync(OpAsync.YIELD, (time | 0) + 1)
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
                wr.emitAsync(OpAsync.CLOUD_UPLOAD, numargs - 1)
                wr.pop()
                return values.zero
            }
            case "format": {
                const arg0 = expr.arguments[0]
                if (arg0?.type != "Literal" || typeof arg0.value != "string")
                    this.throwError(expr, "format() requires string arg")
                this.emitArgs(expr.arguments.slice(1))
                const r = wr.allocBuf()
                const vd = wr.emitString(arg0.value)
                wr.emitSync(OpSync.FORMAT, vd.index, numargs - 1)
                return r
            }
        }
        this.throwError(expr, "unhandled call")
    }

    private emitIdentifier(expr: estree.Identifier): ValueDesc {
        const id = this.forceName(expr)
        const cell = this.locals.lookup(id)
        if (!cell) this.throwError(expr, "unknown name: " + id)
        return cell.value()
    }

    private matchesSpecName(pi: jdspec.PacketInfo, id: string) {
        // TODO camel case
        return pi.name == id
    }

    private emitMemberExpression(expr: estree.MemberExpression): ValueDesc {
        const obj = this.emitExpr(expr.object)
        if (obj.kind == CellKind.JD_ROLE) {
            assert(obj.cell instanceof Role)
            const role = obj.cell as Role
            const id = this.forceName(expr.property)
            let r: ValueDesc

            let generic: jdspec.PacketInfo
            for (const p of this.sysSpec.packets) {
                if (this.matchesSpecName(p, id)) generic = p
            }

            for (const p of role.spec.packets) {
                if (
                    this.matchesSpecName(p, id) ||
                    (generic?.identifier == p.identifier &&
                        generic?.kind == p.kind)
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
                }
            }

            if (!r)
                this.throwError(
                    expr,
                    `role ${role.getName()} has no member ${id}`
                )
            return r
        }

        this.throwError(expr, `unhandled member ${idName(expr.property)}`)

        function isRegister(pi: jdspec.PacketInfo) {
            return pi.kind == "ro" || pi.kind == "rw" || pi.kind == "const"
        }

        function isEvent(pi: jdspec.PacketInfo) {
            return pi.kind == "event"
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
        const r = this.locals.lookup(name)
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
                break
            default:
                this.throwError(node, "value required here")
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

    private emitBinaryExpression(expr: estree.BinaryExpression): ValueDesc {
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
            "&": OpBinary.AND,
            "|": OpBinary.OR,
        }

        let op = expr.operator
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
        this.throwError(expr, "unhandled operator")
    }

    private expectExpr(expr: estree.Expression, kind: CellKind): ValueDesc {
        const r = this.emitExpr(expr)
        if (r.kind != kind && r.kind != CellKind.ERROR)
            return this.throwError(
                expr,
                `expecting ${stringifyCellKind(kind)}; got ${stringifyCellKind(
                    r.kind
                )}`
            )
        return r
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

    private emitStmt(stmt: estree.BaseStatement) {
        const src = this.sourceFrag(stmt.range)
        if (src) this.writer.emitComment(src)

        try {
            switch (stmt.type) {
                case "Program":
                    return this.emitProgram(stmt as estree.Program)
                case "ExpressionStatement":
                    return this.emitExpressionStatement(
                        stmt as estree.ExpressionStatement
                    )
                case "VariableDeclaration":
                    return this.emitVariableDeclaration(
                        stmt as estree.VariableDeclaration
                    )
                default:
                    console.error(stmt)
                    this.throwError(stmt, `unhandled type: ${stmt.type}`)
            }
        } catch (e) {
            if (e.sourceNode !== undefined) {
                const node = e.sourceNode || stmt
                this.reportError(node.range, e.message)
            } else {
                this.reportError(stmt.range, "Internal error: " + e.message)
                console.error(e.stack)
            }
        }
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

        console.log(this.procs.map(p => p.toString()).join("\n"))
    }
}

new Program(sample).emit()

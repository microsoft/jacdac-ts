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

    JMP = 9, // REG[4] BACK[1] IF_ZERO[1] B:OFF[6]
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

export enum CellType {
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

export function stringifyValueKind(vk: CellType) {
    switch (vk) {
        case CellType.REG:
            return "(reg)"
        case CellType.LOCAL:
            return "local variable"
        case CellType.GLOBAL:
            return "global variable"
        case CellType.FLOAT:
            return "float literal"
        case CellType.INT:
            return "int literal"
        case CellType.SPECIAL:
            return "special value"
        case CellType.RESERVED_6:
            return "(reserved 6)"
        case CellType.RESERVED_7:
            return "(reserved 7)"
        case CellType.SMALL_INT:
            return "small int literal"
        case CellType.JD_EVENT:
            return "Jacdac event"
        case CellType.JD_REG:
            return "Jacdac register"
        case CellType.JD_ROLE:
            return "Jacdac role"
        case CellType.ERROR:
            return "(error node)"
        default:
            return "ValueKind: 0x" + (vk as number).toString(16)
    }
}

export interface InstrArgResolver {
    describeArg16(idx: number): string
    funName(idx: number): string
    roleName(idx: number): string
}

export function bitSize(fmt: OpFmt) {
    return 8 << (fmt & 0b11)
}

export function stringifyInstr(instr: number, resolver?: InstrArgResolver) {
    const op = instr >>> 24
    const subop = (instr >>> 20) & 0xf
    const dst = (instr >>> 16) & (NUM_REGS - 1)
    const left = (instr >> 8) & 0xff
    const right = (instr >> 0) & 0xff
    const arg = (instr >> 0) & 0xffff
    const offset = right
    const roleidx = (instr >> 9) & 0x7f
    const code = instr & 0x1ff

    switch (op) {
        case Op.BINARY:
            return `R${dst} := ${arg8(left)} ${bincode()} ${arg8(right)}`
        case Op.UNARY:
            return `R${dst} := ${uncode()}${arg16(arg)}`
        case Op.STORE:
            return `${arg16(arg)} := R${dst}`
        case Op.JUMP:
            return "jmp " + jmpcode()
        case Op.CALL:
            return `call ${resolver.funName(right)}_F${right} #${dst}`
        case Op.CALL_BG:
            return `callbg ${resolver.funName(right)}_F${right} #${dst}`
        case Op.CALL_RT:
            return `callrt ${right} #${dst}`
        case Op.RET:
            return `ret`
        case Op.FORMAT:
            return `buf[${offset}...] := format/${subop}(str-${left}, R0, ..., R${
                dst - 1
            })`
        case Op.SETUP_BUFFER:
            return `clear buf[0...${offset}]`
        case Op.SET_BUFFER:
            return `buf[${offset}] @ ${numfmt()} := R${dst}`
        case Op.GET_BUFFER:
            return `R${dst} := buf[${offset}] @ ${numfmt()}`
        case Op.GET_REG:
            return `get_reg(${jdreg()}, refresh=${subop})`
        case Op.SET_REG:
            return `set_reg(${jdreg()})`
        case Op.WAIT_REG:
            return `wait ${jdreg()} refresh[${subop}]`
        case Op.WAIT_PKT:
            return `wait pkt from ${role()}`
        case Op.SET_TIMEOUT:
            return `set timeout ${arg16(arg)} ms`
        case Op.YIELD:
            return `yield`
        default:
            return `unknown (0x${op.toString(16)})`
    }

    function jdreg() {
        return `${role()}.reg_0x${code.toString(16)}`
    }

    function role() {
        return (resolver?.roleName(roleidx) || "") + "_r" + roleidx
    }

    function numfmt() {
        const fmt = subop
        const bitsz = bitSize(fmt)
        const letter = ["u", "i", "f", "x"][fmt >> 2]
        if (left) return letter + (bitsz - left) + "." + left
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
    function jmpcode() {
        const offset = (subop & 1 ? "-" : "+") + arg
        switch (subop & ~1) {
            case OpJump.FORWARD:
                return offset
            case OpJump.FORWARD_IF_ZERO:
                return `${offset} if not R${dst}`
            case OpJump.FORWARD_IF_NOT_ZERO:
                return `${offset} if R${dst}`
            default:
                return `${offset} jmp-${subop} R${dst}`
        }
    }
    function arg16(a: number) {
        const idx = a & 0x0fff
        const r = resolver?.describeArg16(a) || ""
        switch (a >> 12) {
            case CellType.REG:
                return `R${idx}`
            case CellType.LOCAL:
                return `${r}_L${idx}`
            case CellType.GLOBAL:
                return `${r}_G${idx}`
            case CellType.FLOAT:
                return `${r}_F${idx}`
            case CellType.INT:
                return `${r}_I${idx}`
            case CellType.SPECIAL:
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
            case CellType.RESERVED_6:
                return `X6[${idx}]`
            case CellType.RESERVED_7:
                return `X7[${idx}]`
            default:
                return `${a & ~0x8000}`
        }
    }
    function arg8(a: number) {
        return arg16(((a & 0xf0) << 8) | (a & 0x0f))
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
        return mkValue(CellType.JD_ROLE, this.index, this)
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
        const kind = this.isLocal ? CellType.LOCAL : CellType.GLOBAL
        return mkValue(kind, this.index, this)
    }
}

interface ValueDesc {
    kind: CellType
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

function mkValue(kind: CellType, index: number, cell?: Cell): ValueDesc {
    return {
        kind,
        index,
        cell,
    }
}

function floatVal(v: number) {
    const r = mkValue(CellType.X_FLOAT, v)
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
    return mkValue(CellType.SPECIAL, sp)
}

const values = {
    zero: floatVal(0),
    error: mkValue(CellType.ERROR, 0),
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

    pop() {
        const scope = this.scopes.pop()
        for (const r of scope) {
            this._freeReg(r)
        }
    }

    allocBuf(): ValueDesc {
        if (this.allocatedRegsMask & (1 << BUFFER_REG))
            this.parent.parent.throwError(null, "buffer already in use")
        return this.doAlloc(BUFFER_REG, CellType.JD_CURR_BUFFER)
    }

    private doAlloc(regno: number, kind = CellType.X_FP_REG) {
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

    _freeReg(v: ValueDesc) {
        const idx = this.allocatedRegs.indexOf(v)
        assert(idx >= 0)
        this.allocatedRegs.splice(idx, 1)
        this.allocatedRegsMask &= ~(1 << v.index)
    }

    emitString(s: string) {
        return mkValue(
            CellType.X_STRING,
            addUnique(this.parent.parent.stringLiterals, s)
        )
    }

    emitLiteral(dest: ValueDesc, v: number) {
        assert(this.isReg(dest))

        let r: ValueDesc
        if (isNaN(v)) {
            r = specialVal(ValueSpecial.NAN)
        } else if ((v | 0) == v) {
            if (0 <= v && v <= 0x7fff) {
                r = mkValue(CellType.SMALL_INT, v)
            } else {
                r = mkValue(
                    CellType.INT,
                    addUnique(this.parent.parent.intLiterals, v)
                )
            }
        } else {
            r = mkValue(
                CellType.FLOAT,
                addUnique(this.parent.parent.floatLiterals, v)
            )
        }

        r.litValue = v
        return r
    }

    arg16(v: ValueDesc) {
        if (v.kind < CellType.SMALL_INT) {
            assertRange(0, v.index, 0x0fff)
            return (v.kind << 12) | v.index
        } else if (v.kind == CellType.SMALL_INT) {
            assertRange(0, v.index, 0x7fff)
            return 0x8000 | v.index
        } else {
            if (v.kind == CellType.ERROR) return 0 // error already emitted
            oops("cannot emit " + stringifyValueKind(v.kind))
        }
    }

    isArg8(v: ValueDesc) {
        return (this.arg16(v) & 0x0ff0) == 0
    }

    isWritable(v: ValueDesc) {
        return (
            this.isReg(v) ||
            v.kind == CellType.LOCAL ||
            v.kind == CellType.GLOBAL
        )
    }

    isReg(v: ValueDesc) {
        return v.kind == CellType.X_FP_REG
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

    assign(dst: ValueDesc, src: ValueDesc) {
        if (src == dst) return
        if (this.isReg(dst)) {
            this.emitLoadCell(dst, src.kind, src.index)
        } else if (this.isReg(src)) {
            this.emitStoreCell(dst.kind, dst.index, src)
        } else {
            const r = this.allocReg()
            this.assign(r, src)
            this.assign(dst, r)
            this._freeReg(r)
        }
    }

    private emitFloatLiteral(dst: ValueDesc, v: number) {
        if (isNaN(v)) {
            this.emitLoadCell(dst, CellType.SPECIAL, ValueSpecial.NAN)
        } else if ((v | 0) == v && 0 <= v && v <= 0xffff) {
            this.emitLoadCell(dst, CellType.IDENTITY, v)
        } else {
            this.emitLoadCell(
                dst,
                CellType.FLOAT_CONST,
                addUnique(this.parent.parent.floatLiterals, v)
            )
        }
    }

    emitLoadCell(dst: ValueDesc, celltype: CellType, idx: number) {
        assert(this.isReg(dst))
        switch (celltype) {
            case CellType.LOCAL:
            case CellType.GLOBAL:
            case CellType.FLOAT_CONST:
            case CellType.IDENTITY:
            case CellType.BUFFER:
            case CellType.SPECIAL:
                this.emitLoadStoreCell(OpTop.LOAD_CELL, dst, celltype, idx)
                break
            case CellType.X_FP_REG:
                this.emitMov(dst.index, idx)
                break
            case CellType.X_FLOAT:
                this.emitFloatLiteral(dst, idx)
                break
            case CellType.ERROR:
                // ignore
                break
            default:
                oops("can't load")
                break
        }
    }

    emitStoreCell(celltype: CellType, idx: number, src: ValueDesc) {
        switch (celltype) {
            case CellType.LOCAL:
            case CellType.GLOBAL:
            case CellType.BUFFER:
                this.emitLoadStoreCell(OpTop.STORE_CELL, src, celltype, idx)
                break
            case CellType.X_FP_REG:
                this.emitMov(idx, src.index)
                break
            case CellType.ERROR:
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
        celltype: CellType,
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

    emitOp(op: Op, subop: number = 0, dst: number = 0, arg: number = 0) {
        const instr = this.mkOp(op, subop, dst)
        assertRange(0, arg, 0xffff)
        this.emitInstr(instr | arg)
    }

    emitSetTimeout(time: ValueDesc) {
        this.emitOp(Op.SET_TIMEOUT, 0, 0, this.arg16(time))
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
            CellType.BUFFER,
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
        const cmp = this.allocReg()
        this.emitBin(subop, cmp, left, right)
        this.emitJump(label, OpJump.FORWARD_IF_ZERO, cmp.index)
        this.pop()
    }

    emitJump(label: Label, cond: OpJump = OpJump.FORWARD, dst: number = -1) {
        switch (cond) {
            case OpJump.FORWARD:
                assert(dst == -1)
                dst = 0
                break
            case OpJump.FORWARD_IF_NOT_ZERO:
            case OpJump.FORWARD_IF_ZERO:
                assert(dst != -1)
                break
            default:
                oops("invalid jmp")
        }
        label.uses.push(this.binary.length)
        this.emitComment("jump " + label.name)
        this.emitInstr(this.mkOp(Op.JUMP, cond, dst))
    }

    patchLabels() {
        for (const l of this.labels) {
            assert(l.offset != -1)
            for (const u of l.uses) {
                let op = this.binary[u]
                assert(op >> 24 == Op.JUMP)
                let off = l.offset - u
                assert(off != 0)
                if (off < 0) {
                    off = -off
                    op |= this.mkOp(Op.JUMP, OpJump.BACK)
                }
                assert((op & 0xffff) == 0)
                off -= 1
                assertRange(0, off, 0xffff)
                op |= off
                this.binary[u] = op >>> 0
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

class Program {
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
    destReg: ValueDesc

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

    describeCell(t: CellType, idx: number): string {
        switch (t) {
            case CellType.LOCAL:
                return this.locals.describeIndex(idx)
            case CellType.GLOBAL:
                return this.globals.describeIndex(idx)
            case CellType.FLOAT_CONST:
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
        const regcode = role.encode() | obj.spec.identifier
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
                    wr.emitBufOp(
                        OpTop.LOAD_CELL,
                        this.destReg,
                        0,
                        obj.spec.fields[0]
                    )
                    return this.destReg
                } else {
                    const r = mkValue(CellType.JD_VALUE_SEQ, 0, role)
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
                    let v = this.emitExprInto(expr.arguments[i], this.destReg)
                    if (v.kind == CellType.JD_CURR_BUFFER) {
                        if (i != expr.arguments.length - 1)
                            this.throwError(
                                expr.arguments[i + 1],
                                "args can't follow a buffer"
                            )
                        break
                    }
                    this.writer.assign(this.destReg, v)
                    const f = obj.spec.fields[i]
                    wr.emitBufOp(OpTop.STORE_CELL, this.destReg, off, f)
                    off += Math.abs(f.storage)
                    assert(off <= sz)
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
        if (v.kind == CellType.X_FLOAT) return floatVal(v.index * scale)
        this.writer.emitBin(OpBinary.MUL, v, floatVal(scale))
        return v
    }

    private emitArgs(args: Expr[]) {
        const wr = this.writer
        const regs = wr.allocArgs(args.length)
        wr.push()
        for (let i = 0; i < args.length; i++) {
            this.emitSimpleValue(args[i], regs[i])
        }
        wr.pop()
    }

    private litValue(expr: Expr) {
        const tmp = this.emitExpr(expr)
        if (tmp.kind != CellType.X_FLOAT)
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
                case CellType.JD_EVENT:
                    return this.emitEventCall(expr, obj, prop)
                case CellType.JD_REG:
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
                if (lbl.kind != CellType.JD_CURR_BUFFER)
                    this.throwError(
                        expr.arguments[0],
                        "expecting buffer (string) here; got " +
                            stringifyValueKind(lbl.kind)
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
        if (obj.kind == CellType.JD_ROLE) {
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
                        r = mkValue(CellType.JD_REG, p.identifier, role)
                        r.spec = p
                    }
                    if (isEvent(p)) {
                        assert(!r)
                        r = mkValue(CellType.JD_EVENT, p.identifier, role)
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

    private emitSimpleValue(expr: Expr, dest?: ValueDesc) {
        const val = dest ? this.emitExprInto(expr, dest) : this.emitExpr(expr)
        this.requireRuntimeValue(expr, val)
        this.writer.assign(dest, val)
        return dest
    }

    private requireRuntimeValue(node: estree.BaseNode, v: ValueDesc) {
        switch (v.kind) {
            case CellType.X_FP_REG:
            case CellType.LOCAL:
            case CellType.GLOBAL:
            case CellType.FLOAT_CONST:
            case CellType.IDENTITY:
            case CellType.X_FLOAT:
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
            if (src.kind == CellType.JD_VALUE_SEQ) {
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
                    wr.emitBufOp(Op.GET_BUFFER, tmpreg, off, f)
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
        try {
            wr.push()
            if (swap) {
                const a = this.emitSimpleValue(expr.left)
                const b = this.emitSimpleValue(expr.right, this.destReg)
                assert(b == this.destReg)
                wr.emitBin(op2, b, a)
                return b
            } else {
                const a = this.emitSimpleValue(expr.left, this.destReg)
                const b = this.emitSimpleValue(expr.right)
                assert(a == this.destReg)
                wr.emitBin(op2, a, b)
                return a
            }
        } finally {
            wr.pop()
        }
    }

    private emitUnaryExpression(expr: estree.UnaryExpression): ValueDesc {
        this.throwError(expr, "unhandled operator")
    }

    private expectExpr(expr: estree.Expression, kind: CellType): ValueDesc {
        const r = this.emitExpr(expr)
        if (r.kind != kind && r.kind != CellType.ERROR)
            return this.throwError(
                expr,
                `expecting ${stringifyValueKind(
                    kind
                )}; got ${stringifyValueKind(r.kind)}`
            )
        return r
    }

    private emitExpr(expr: Expr): ValueDesc {
        const reg = this.writer.allocReg()
        const res = this.emitExprInto(expr, reg)
        if (res != reg) this.writer._freeReg(reg)
        return res
    }

    private emitExprInto(expr: Expr, dest: ValueDesc): ValueDesc {
        const prevDest = this.destReg
        this.destReg = dest
        try {
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
        } finally {
            this.destReg = prevDest
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

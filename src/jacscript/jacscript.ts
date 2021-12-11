import * as esprima from "esprima"
import * as estree from "estree"
import { range } from "../jdom/utils"
import { serviceSpecificationFromName } from "../jdom/spec"

export interface SMap<T> {
    [k: string]: T
}

// formats:
// $op      - 31:24      JDVM_OP_*
// $subop   - 23:20      JDVM_SUBOP_*
// $dst     - 19:16      destination register index
// $src     - $dst       used when $dst is actually source
// $left    - 15:8       left argument of binary op (arg8 enc.)
// $right   - 7:0        right argument of binary op (arg8 enc.)
// $arg16   - 15:0       argument of unary ops (arg16 enc.)
// $role    - 15:9       index into roles table
// $code    - 8:0        9 bit register or command code
// $ms      - $subop     delay in miliseconds, refresh_ms_value[] index
// $fn      - $right     points into functions section
// $rtfn    - $right     one of RtFunction
// $opcnt   - $dst       number of args to pass to call
// $str     - $left      points into string_literals section
// $offset  - $right
// $shift   - $left
// $numfmt  - $subop

export const NUM_REGS = 16

export enum ValueKind {
    REG = 0x0,
    LOCAL = 0x1,
    GLOBAL = 0x2,
    FLOAT = 0x3,
    INT = 0x4,
    SPECIAL = 0x5,
    RESERVED_6 = 0x6,
    RESERVED_7 = 0x7,
    SMALL_INT = 0x8, // until 0xF

    // these cannot be emitted directly
    JD_EVENT = 0x100,
    JD_REG = 0x101,
    JD_ROLE = 0x102,
    JD_VALUE_SEQ = 0x103,
    JD_CURR_BUFFER = 0x104,
    JD_STRING = 0x105,

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

export enum Op {
    INVALID = 0x00,
    BINARY = 0x01, // $dst := $left $subop $right
    UNARY = 0x02, // $dst := $subop $arg16
    STORE = 0x03, // $arg16 := $src
    JUMP = 0x04, // jump $subop($src) $arg16 (offset)
    CALL = 0x05, // call $fn/$opcnt
    CALL_BG = 0x06, // callbg $fn/$opcnt (max pending?)
    CALL_RT = 0x11, // callrt $rtfn/$opcnt
    RET = 0x07, // ret
    FORMAT = 0x10, // buffer[$offset] = $str % r0,...
    SETUP_BUFFER = 0x20, // clear buffer sz=$offset
    SET_BUFFER = 0x21, // buffer[$offset @ $numfmt] := $src
    GET_BUFFER = 0x22, // $dst := buffer[$offset @ $numfmt]
    GET_REG = 0x80, // buffer := $role.$code (refresh: $ms)
    SET_REG = 0x81, // $role.$code := buffer
    WAIT_REG = 0x82, // wait for $role.$code change, refresh $ms
    WAIT_PKT = 0x83, // wait for any pkt from $role
    YIELD = 0x84, // yield
    SET_TIMEOUT = 0x90, // set_timeout $arg16 ms
}

export enum RtFunction {
    CloudUpload = 0x01,
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

// FORWARD_* | BACK = BACK_*
export enum OpJump {
    FORWARD = 0x0,
    BACK = 0x1,
    FORWARD_IF_ZERO = 0x2,
    BACK_IF_ZERO = 0x3,
    FORWARD_IF_NOT_ZERO = 0x4,
    BACK_IF_NOT_ZERO = 0x5,
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

export enum OpFormat {
    None = 0,
    CurlyAlpha = 1,
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

export function stringifyValueKind(vk: ValueKind) {
    switch (vk) {
        case ValueKind.REG:
            return "(reg)"
        case ValueKind.LOCAL:
            return "local variable"
        case ValueKind.GLOBAL:
            return "global variable"
        case ValueKind.FLOAT:
            return "float literal"
        case ValueKind.INT:
            return "int literal"
        case ValueKind.SPECIAL:
            return "special value"
        case ValueKind.RESERVED_6:
            return "(reserved 6)"
        case ValueKind.RESERVED_7:
            return "(reserved 7)"
        case ValueKind.SMALL_INT:
            return "small int literal"
        case ValueKind.JD_EVENT:
            return "Jacdac event"
        case ValueKind.JD_REG:
            return "Jacdac register"
        case ValueKind.JD_ROLE:
            return "Jacdac role"
        case ValueKind.ERROR:
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
            case ValueKind.REG:
                return `R${idx}`
            case ValueKind.LOCAL:
                return `${r}_L${idx}`
            case ValueKind.GLOBAL:
                return `${r}_G${idx}`
            case ValueKind.FLOAT:
                return `${r}_F${idx}`
            case ValueKind.INT:
                return `${r}_I${idx}`
            case ValueKind.SPECIAL:
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
            case ValueKind.RESERVED_6:
                return `X6[${idx}]`
            case ValueKind.RESERVED_7:
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
        return mkValue(ValueKind.JD_ROLE, this.index, this)
    }
    encode() {
        assert(this.index <= 0x7f)
        return this.index << 9
    }
}

class Variable extends Cell {
    isLocal = false

    constructor(definition: estree.VariableDeclarator, scope: VariableScope) {
        super(definition, scope)
    }
    value(): ValueDesc {
        const kind = this.isLocal ? ValueKind.LOCAL : ValueKind.GLOBAL
        return mkValue(kind, this.index, this)
    }
}

interface ValueDesc {
    kind: ValueKind
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

function mkValue(kind: ValueKind, index: number, cell?: Cell): ValueDesc {
    return {
        kind,
        index,
        cell,
    }
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
    return mkValue(ValueKind.SPECIAL, sp)
}

const values = {
    zero: mkValue(ValueKind.SMALL_INT, 0),
    error: mkValue(ValueKind.ERROR, 0),
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
        return this.doAlloc(BUFFER_REG, ValueKind.JD_CURR_BUFFER)
    }

    private doAlloc(regno: number, kind = ValueKind.REG) {
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
            ValueKind.JD_STRING,
            addUnique(this.parent.parent.stringLiterals, s)
        )
    }

    emitLiteral(v: number) {
        let r: ValueDesc
        if (isNaN(v)) {
            r = specialVal(ValueSpecial.NAN)
        } else if ((v | 0) == v) {
            if (0 <= v && v <= 0x7fff) {
                r = mkValue(ValueKind.SMALL_INT, v)
            } else {
                r = mkValue(
                    ValueKind.INT,
                    addUnique(this.parent.parent.intLiterals, v)
                )
            }
        } else {
            r = mkValue(
                ValueKind.FLOAT,
                addUnique(this.parent.parent.floatLiterals, v)
            )
        }

        r.litValue = v
        return r
    }

    arg16(v: ValueDesc) {
        if (v.kind < ValueKind.SMALL_INT) {
            assertRange(0, v.index, 0x0fff)
            return (v.kind << 12) | v.index
        } else if (v.kind == ValueKind.SMALL_INT) {
            assertRange(0, v.index, 0x7fff)
            return 0x8000 | v.index
        } else {
            if (v.kind == ValueKind.ERROR) return 0 // error already emitted
            oops("cannot emit " + stringifyValueKind(v.kind))
        }
    }

    isArg8(v: ValueDesc) {
        return (this.arg16(v) & 0x0ff0) == 0
    }

    isWritable(v: ValueDesc) {
        return (
            this.isReg(v) ||
            v.kind == ValueKind.LOCAL ||
            v.kind == ValueKind.GLOBAL
        )
    }

    isReg(v: ValueDesc) {
        return v.kind == ValueKind.REG
    }

    arg8(v: ValueDesc) {
        const q = this.arg16(v)
        assert((q & 0x0ff0) == 0)
        return (q >> 8) | (q & 0xf)
    }

    mkOp(op: Op, subop: number = 0, dst: number = 0) {
        assert(0 <= dst && dst < NUM_REGS)
        assert(0 <= subop && subop <= 0xf)
        assert(0 <= op && op <= 0xff)
        return (op << 24) | (subop << 20) | (dst << 16)
    }

    emitOp(op: Op, subop: number = 0, dst: number = 0, arg: number = 0) {
        const instr = this.mkOp(op, subop, dst)
        assertRange(0, arg, 0xffff)
        this.emitInstr(instr | arg)
    }

    emitSetTimeout(time: ValueDesc) {
        this.emitOp(Op.SET_TIMEOUT, 0, 0, this.arg16(time))
    }

    emitBufOp(op: Op, dst: ValueDesc, off: number, mem: jdspec.PacketMember) {
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

        this.emitInstr(this.mkOp(op, fmt, dst.index) | (shift << 8) | off)
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

    emitJumpIfTrue(
        label: Label,
        subop: OpBinary,
        left: ValueDesc,
        right: ValueDesc
    ) {
        this.push()
        const cmp = this.allocReg()
        this.emitBin(subop, cmp, left, right)
        this.emitJump(label, OpJump.FORWARD_IF_NOT_ZERO, cmp.index)
        this.pop()
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

    emitCall(proc: Procedure) {
        this.emitInstr(this.mkOp(Op.CALL) | proc.index)
    }

    emitCallRt(rt: RtFunction, numargs: number) {
        this.emitInstr(this.mkOp(Op.CALL_RT, 0, numargs) | rt)
    }

    emitLoad(dst: ValueDesc, src: ValueDesc) {
        assert(this.isReg(dst))
        this.emitInstr(
            this.mkOp(Op.UNARY, OpUnary.ID, dst.index) | this.arg16(src)
        )
        return dst
    }

    emitStore(dst: ValueDesc, src: ValueDesc) {
        assert(this.isReg(src), "store-reg")
        assert(this.isWritable(dst), "store-val")
        this.emitInstr(this.mkOp(Op.STORE, 0, src.index) | this.arg16(dst))
    }

    emitUnary(op: OpUnary, dst: ValueDesc, arg: ValueDesc) {
        this.push()

        const dst0 = this.isReg(dst) ? dst : this.allocReg()
        this.emitInstr(this.mkOp(Op.UNARY, op, dst0.index) | this.arg16(arg))
        if (dst != dst0) this.emitStore(dst, dst0)

        this.pop()
    }

    asReg(v: ValueDesc) {
        if (this.isReg(v)) return v
        return this.emitLoad(this.allocReg(), v)
    }

    emitBin(op: OpBinary, dst: ValueDesc, left: ValueDesc, right: ValueDesc) {
        this.push()

        const dst0 = this.isReg(dst) ? dst : this.allocReg()

        if (!this.isArg8(left)) left = this.asReg(left)
        if (!this.isArg8(right)) right = this.asReg(right)

        this.emitInstr(
            this.mkOp(Op.BINARY, op, dst0.index) |
                (this.arg8(left) << 8) |
                this.arg8(right)
        )

        if (dst != dst0) this.emitStore(dst, dst0)

        this.pop()
    }
}

class Procedure {
    writer = new OpWriter(this)
    index: number
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
    Normal = 1, // 500ms
}

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

    describeArg16(a: number): string {
        const idx = a & 0x0fff
        switch (a >> 12) {
            case ValueKind.LOCAL:
                return this.locals.describeIndex(idx)
            case ValueKind.GLOBAL:
                return this.globals.describeIndex(idx)
            case ValueKind.FLOAT:
                return this.floatLiterals[idx] + ""
            case ValueKind.INT:
                return this.intLiterals[idx] + ""
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
                this.writer.emitOp(Op.WAIT_PKT, 0, 0, r.encode())
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
        const wr = this.writer
        wr.push()
        wr.emitStore(trg.value(), wr.asReg(src))
        wr.pop()
    }

    private emitVariableDeclaration(decls: estree.VariableDeclaration) {
        if (decls.kind != "var") this.throwError(decls, "only 'var' supported")
        for (const decl of decls.declarations) {
            const id = this.forceName(decl.id)
            const r = this.parseRole(decl)
            if (!r) {
                const g = new Variable(decl, this.globals)
                this.emitStore(
                    g,
                    decl.init ? this.emitExpr(decl.init) : values.zero
                )
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
            wr.emitOp(Op.RET)
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
                        wr.emitLiteral(obj.spec.identifier),
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
                wr.emitOp(Op.GET_REG, refresh, 0, regcode)
                if (obj.spec.fields.length == 1) {
                    const v = wr.allocReg()
                    wr.emitBufOp(Op.GET_BUFFER, v, 0, obj.spec.fields[0])
                    return v
                } else {
                    const r = mkValue(ValueKind.JD_VALUE_SEQ, 0, role)
                    r.spec = obj.spec
                    return r
                }
            case "write":
                this.requireArgs(expr, obj.spec.fields.length)
                let tmpreg: ValueDesc
                let off = 0
                wr.push()
                let sz = 0
                for (const f of obj.spec.fields) sz += Math.abs(f.storage)
                wr.emitOp(Op.SETUP_BUFFER, 0, 0, sz)
                for (let i = 0; i < expr.arguments.length; ++i) {
                    let v = this.emitExpr(expr.arguments[i])
                    if (v.kind == ValueKind.JD_CURR_BUFFER) {
                        if (i != expr.arguments.length - 1)
                            this.throwError(
                                expr.arguments[i + 1],
                                "args can't follow a buffer"
                            )
                        break
                    }
                    if (v.kind != ValueKind.REG) {
                        if (!tmpreg) tmpreg = wr.allocReg()
                        wr.emitLoad(tmpreg, v)
                        v = tmpreg
                    }
                    const f = obj.spec.fields[i]
                    wr.emitBufOp(Op.SET_BUFFER, v, off, f)
                    off += Math.abs(f.storage)
                    assert(off <= sz)
                }
                wr.emitOp(Op.SET_REG, 0, 0, regcode)
                wr.pop()
                return values.zero
        }
        this.throwError(expr, `events don't have property ${prop}`)
    }

    private multExpr(v: ValueDesc, scale: number) {
        if (v.litValue !== undefined)
            return this.writer.emitLiteral(v.litValue * scale)
        const r = this.writer.allocReg()
        this.writer.emitBin(OpBinary.MUL, r, v, this.writer.emitLiteral(scale))
        return r
    }

    private emitArgs(args: (estree.Expression | estree.SpreadElement)[]) {
        const wr = this.writer
        const regs = wr.allocArgs(args.length)
        wr.push()
        for (let i = 0; i < args.length; i++) {
            wr.push()
            wr.emitLoad(regs[i], this.emitExpr(args[i]))
            wr.pop()
        }
        wr.pop()
    }

    private emitCallExpression(expr: estree.CallExpression): ValueDesc {
        const wr = this.writer
        const numargs = expr.arguments.length
        if (expr.callee.type == "MemberExpression") {
            const prop = idName(expr.callee.property)
            const obj = this.emitExpr(expr.callee.object)
            switch (obj.kind) {
                case ValueKind.JD_EVENT:
                    return this.emitEventCall(expr, obj, prop)
                case ValueKind.JD_REG:
                    return this.emitRegisterCall(expr, obj, prop)
            }
        }
        switch (idName(expr.callee)) {
            case "wait": {
                this.requireArgs(expr, 1)
                let time = this.emitExpr(expr.arguments[0])
                time = this.multExpr(time, 1000)
                wr.emitSetTimeout(time)
                wr.emitOp(Op.YIELD)
                return values.zero
            }
            case "upload": {
                if (numargs == 0)
                    this.throwError(expr, "upload() requires args")
                wr.push()
                const lbl = this.emitExpr(expr.arguments[0])
                if (lbl.kind != ValueKind.JD_CURR_BUFFER)
                    this.throwError(
                        expr.arguments[0],
                        "expecting buffer (string) here; got " +
                            stringifyValueKind(lbl.kind)
                    )
                this.emitArgs(expr.arguments.slice(1))
                wr.emitCallRt(RtFunction.CloudUpload, numargs - 1)
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
                wr.emitInstr(
                    wr.mkOp(Op.FORMAT, OpFormat.CurlyAlpha, numargs - 1) |
                        (vd.index << 8) |
                        0
                )
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
        if (obj.kind == ValueKind.JD_ROLE) {
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
                        r = mkValue(ValueKind.JD_REG, p.identifier, role)
                        r.spec = p
                    }
                    if (isEvent(p)) {
                        assert(!r)
                        r = mkValue(ValueKind.JD_EVENT, p.identifier, role)
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
            wr.emitInstr(
                wr.mkOp(Op.FORMAT, OpFormat.None, 0) | (vd.index << 8) | 0
            )
            return r
        }

        if (typeof v == "number") return wr.emitLiteral(v)
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

    private emitSimpleValue(expr: estree.Expression) {
        const r = this.emitExpr(expr)
        this.requireRuntimeValue(expr, r)
        return r
    }

    private requireRuntimeValue(node: estree.BaseNode, v: ValueDesc) {
        switch (v.kind) {
            case ValueKind.REG:
            case ValueKind.LOCAL:
            case ValueKind.GLOBAL:
            case ValueKind.FLOAT:
            case ValueKind.INT:
            case ValueKind.SPECIAL:
            case ValueKind.SMALL_INT:
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
            if (src.kind == ValueKind.JD_VALUE_SEQ) {
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
        const res = wr.allocReg()
        wr.push()
        const a = this.emitSimpleValue(expr.left)
        const b = this.emitSimpleValue(expr.right)
        if (swap) wr.emitBin(op2, res, b, a)
        else wr.emitBin(op2, res, a, b)
        wr.pop()
        return res
    }

    private emitUnaryExpression(expr: estree.UnaryExpression): ValueDesc {
        this.throwError(expr, "unhandled operator")
    }

    private expectExpr(expr: estree.Expression, kind: ValueKind): ValueDesc {
        const r = this.emitExpr(expr)
        if (r.kind != kind && r.kind != ValueKind.ERROR)
            return this.throwError(
                expr,
                `expecting ${stringifyValueKind(
                    kind
                )}; got ${stringifyValueKind(r.kind)}`
            )
        return r
    }

    private emitExpr(
        expr: estree.Expression | estree.Super | estree.SpreadElement
    ): ValueDesc {
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

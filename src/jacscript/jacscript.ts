import * as esprima from "esprima"
import * as estree from "estree"
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
// $str     - $right     points into string_literals section
// $offset  - $left CHG
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

    ERROR = 0x200,
}

export enum ValueSpecial {
    NAN = 0x0,
    SIZE = 0x1,
}

export enum Op {
    INVALID = 0x00,
    BINARY = 0x01, // $dst := $left $subop $right
    UNARY = 0x02, // $dst := $subop $arg16
    STORE = 0x03, // $arg16 := $src
    JUMP = 0x04, // jump $subop($src) $arg16 (offset)
    CALL = 0x05, // call $fn
    CALL_BG = 0x06, // callbg $fn (max pending?)
    RET = 0x07, // ret
    SPRINTF = 0x10, // buffer[$offset] = $str % r0,...
    SETUP_BUFFER = 0x20, // clear buffer sz=$offset
    SET_BUFFER = 0x21, // buffer[$offset @ $numfmt] := $src
    GET_BUFFER = 0x22, // $dst := buffer[$offset @ $numfmt]
    GET_REG = 0x80, // buffer := $role.$code (refresh: $ms)
    SET_REG = 0x81, // $role.$code := buffer
    WAIT_REG = 0x82, // wait for $role.$code change, refresh $ms
    WAIT_PKT = 0x83, // wait for any pkt from $role
    SET_TIMEOUT = 0x90, // set_timeout $arg16 ms
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

export enum OpJump {
    FORWARD = 0x0,
    BACK = 0x1,
    FORWARD_IF_ZERO = 0x2,
    BACK_IF_ZERO = 0x3,
    FORWARD_IF_NOT_ZERO = 0x4,
    BACK_IF_NOT_ZERO = 0x5,
}

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
var led = roles.ledpixel()
var r, g, b, tint

btnA.down.sub(() => {
  color.enabled.write(true)
  led.color.write(0x00ff00)
  wait(0.3)
  [r, g, b] = color.reading.read()
  tint = (r + g + 2 * b) / log(r + g + b)
  upload("color", r, g, b, tint)
  display.text.write(format("t={0} {1}", tint, r))
  led.color.write(0)
  color.enabled.write(false)
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
        default:
            return "ValueKind: 0x" + (vk as number).toString(16)
    }
}

export interface InstrArgResolver {
    describeArg16(idx: number): string
    funName(idx: number): string
    roleName(idx: number): string
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

    // TODO include resolution context with roles, variables, functions, refresh_ms

    switch (op) {
        case Op.BINARY:
            return `R${dst} := ${arg8(left)} ${bincode()} ${arg8(right)}`
        case Op.UNARY:
            return `R${dst} := ${uncode()}${arg16(arg)}`
        case Op.STORE:
            return `${arg16(arg)} := R${dst}`
        case Op.JUMP:
            return jmpcode()
        case Op.CALL:
            return `call F-${right}`
        case Op.CALL_BG:
            return `callbg F-${right}`
        case Op.RET:
            return `ret`
        case Op.SPRINTF:
            return `buf[${left}...] := format(str-${offset})`
        case Op.SETUP_BUFFER:
            return `clear buf[0...${offset}]`
        case Op.SET_BUFFER:
            return `buf[${offset}] @ ${numfmt()} := R${dst}`
        case Op.GET_BUFFER:
            return `R${dst} := buf[${offset}] @ ${numfmt()}`
        case Op.GET_REG:
            return `buf := ${jdreg()} refresh[${subop}]`
        case Op.SET_REG:
            return `${jdreg()} := buf`
        case Op.WAIT_REG:
            return `wait ${jdreg()} refresh[${subop}]`
        case Op.WAIT_PKT:
            return `wait pkt from ${role}`
        case Op.SET_TIMEOUT:
            return `set timeout ${arg} ms`
    }

    function jdreg() {
        return `${role()}[${code}]`
    }

    function role() {
        return (resolver?.roleName(roleidx) || "") + "_r" + roleidx
    }

    function numfmt() {
        const fmt = subop
        const bitsz = 8 << (fmt & 0b11)
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
    constructor(
        definition: estree.VariableDeclarator,
        scope: VariableScope,
        public spec: jdspec.ServiceSpec
    ) {
        super(definition, scope)
    }
    value(): ValueDesc {
        return mkValue(ValueKind.JD_ROLE, this.index)
    }
}

class Variable extends Cell {
    isLocal = false

    constructor(definition: estree.VariableDeclarator, scope: VariableScope) {
        super(definition, scope)
    }
    value(): ValueDesc {
        const kind = this.isLocal ? ValueKind.LOCAL : ValueKind.GLOBAL
        return mkValue(kind, this.index)
    }
}

interface ValueDesc {
    kind: ValueKind
    index: number
    cell?: Cell
    spec?: jdspec.PacketInfo
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

const values = {
    zero: mkValue(ValueKind.SMALL_INT, 0),
    error: mkValue(ValueKind.ERROR, 0),
}

class OpWriter {
    allocatedRegs: ValueDesc[] = []
    allocatedRegsMask = 0
    scopes: ValueDesc[][] = []
    binary: number[] = []
    assembly = ""
    floatLiterals: number[] = []
    intLiterals: number[] = []

    push() {
        this.scopes.push([])
    }

    pop() {
        const scope = this.scopes.pop()
        for (const r of scope) {
            this._freeReg(r)
        }
    }

    allocReg(shortTerm = false): ValueDesc {
        let regno = -1
        for (let i = 0; i < NUM_REGS; i++) {
            if (!(this.allocatedRegsMask & (1 << i))) {
                regno = i
                if (!shortTerm) break
            }
        }
        assert(regno != -1)
        this.allocatedRegsMask |= 1 << regno
        const r = mkValue(ValueKind.REG, regno)
        this.allocatedRegs.push(r)
        this.scopes[this.scopes.length - 1].push(r)
        return r
    }

    _freeReg(v: ValueDesc) {
        const idx = this.allocatedRegs.indexOf(v)
        assert(idx >= 0)
        this.allocatedRegs.splice(idx, 1)
        this.allocatedRegsMask &= ~(1 << v.index)
    }

    emitLiteral(v: number) {
        if ((v | 0) == v) {
            if (0 <= v && v <= 0x7fff) {
                return mkValue(ValueKind.SMALL_INT, v)
            } else {
                return mkValue(ValueKind.INT, addUnique(this.intLiterals, v))
            }
        } else {
            return mkValue(ValueKind.FLOAT, addUnique(this.floatLiterals, v))
        }

        function addUnique(arr: number[], v: number) {
            let idx = arr.indexOf(v)
            if (idx < 0) {
                idx = arr.length
                arr.push(v)
            }
            return idx
        }
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

    isReg(v: ValueDesc) {
        return v.kind == ValueKind.REG
    }

    arg8(v: ValueDesc) {
        const q = this.arg16(v)
        assert((q & 0x0ff0) == 0)
        return (q >> 8) | (q & 0xf)
    }

    mkOp(op: Op, subop: number, dst: number) {
        assert(0 <= dst && dst < NUM_REGS)
        assert(0 <= subop && subop <= 0xf)
        assert(0 <= op && op <= 0xff)
        return (op << 24) | (subop << 20) | (dst << 16)
    }

    private writeAsm(msg: string) {
        console.log(msg)
        this.assembly += msg + "\n"
    }

    emitComment(msg: string) {
        this.writeAsm("; " + msg.replace(/\n/g, "\n; "))
    }

    emitInstr(v: number) {
        v >>>= 0
        this.writeAsm(stringifyInstr(v))
        this.binary.push(v)
    }

    emitLoad(dst: ValueDesc, src: ValueDesc) {
        assert(this.isReg(dst))
        this.emitInstr(
            this.mkOp(Op.UNARY, OpUnary.ID, dst.index) | this.arg16(src)
        )
        return dst
    }

    emitStore(dst: ValueDesc, src: ValueDesc) {
        assert(this.isReg(src))
        this.emitInstr(this.mkOp(Op.STORE, 0, src.index) | this.arg16(dst))
    }

    emitUnary(op: OpUnary, dst: ValueDesc, arg: ValueDesc) {
        this.push()

        const dst0 = this.isReg(dst) ? dst : this.allocReg(true)
        this.emitInstr(this.mkOp(Op.UNARY, op, dst0.index) | this.arg16(arg))
        if (dst != dst0) this.emitStore(dst, dst0)

        this.pop()
    }

    emitBin(op: OpBinary, dst: ValueDesc, left: ValueDesc, right: ValueDesc) {
        this.push()

        const dst0 = this.isReg(dst) ? dst : this.allocReg(true)

        if (!this.isArg8(left)) left = this.emitLoad(this.allocReg(true), left)
        if (!this.isArg8(right))
            right = this.emitLoad(this.allocReg(true), right)

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
    constructor(public name: string, public index: number) {}
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

class Program {
    roles = new VariableScope(null)
    globals = new VariableScope(this.roles)
    locals = new VariableScope(this.globals)
    tree: estree.Program
    writer = new OpWriter()
    procs: Procedure[] = []

    constructor(public source: string) {}

    indexToPos(idx: number) {
        const s = this.source.slice(0, idx)
        const ln = s.replace(/[^\n]/g, "").length + 1
        const col = s.replace(/.*\n/, "").length + 1
        return `(${ln},${col})`
    }

    error(range: number[] | estree.BaseNode, msg: string): ValueDesc {
        if (!Array.isArray(range)) range = range.range
        console.error(`${this.indexToPos(range[0])}: ${msg}`)
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
                return this.writer.floatLiterals[idx] + ""
            case ValueKind.INT:
                return this.writer.intLiterals[idx] + ""
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

    private forceName(pat: estree.Expression | estree.Pattern) {
        const r = idName(pat)
        if (!r) this.error(pat, "only simple identifiers supported")
        return (pat as estree.Identifier).name
    }

    private parseRole(decl: estree.VariableDeclarator) {
        const expr = decl.init
        if (expr?.type != "CallExpression") return null
        if (expr.callee.type != "MemberExpression") return null
        if (idName(expr.callee.object) != "roles") return null
        const serv = this.forceName(expr.callee.property)
        if (expr.arguments.length != 0)
            return this.error(
                expr,
                `services.${serv}() currently doesn't take arguments`
            )
        const spec = serviceSpecificationFromName(serv)
        if (!spec) return this.error(expr.callee, "no such service: " + serv)
        return new Role(decl, this.roles, spec)
    }

    private emitStore(trg: Variable, src: ValueDesc) {
        this.writer.emitUnary(OpUnary.ID, trg.value(), src)
    }

    private emitVariableDeclaration(decls: estree.VariableDeclaration) {
        if (decls.kind != "var") this.error(decls, "only 'var' supported")
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
        for (const s of prog.body) this.emitStmt(s)
    }

    private emitExpressionStatement(stmt: estree.ExpressionStatement) {
        this.emitExpr(stmt.expression)
    }

    private emitCallExpression(expr: estree.CallExpression): ValueDesc {
        if (expr.callee.type == "MemberExpression") {
            const obj = this.emitExpr(expr.callee.object)
            switch (obj.kind) {
                case ValueKind.JD_EVENT:
                    break
            }
            switch (idName(expr.callee.property)) {
                case "sub":
                    break
            }
        }
        return this.error(expr, "unhandled call")
    }

    private emitIdentifier(expr: estree.Identifier): ValueDesc {
        const id = this.forceName(expr)
        const cell = this.locals.lookup(id)
        if (!cell) return this.error(expr, "unknown name: " + id)
        return cell.value()
    }

    private emitMemberExpression(expr: estree.MemberExpression): ValueDesc {
        const obj = this.emitExpr(expr.object)
        if (obj.kind == ValueKind.JD_ROLE) {
            const role = obj.cell as Role
            const id = this.forceName(expr.property)
            let r: ValueDesc

            for (const p of role.spec.packets) {
                if (!matchesSpecName(p, id)) continue
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

            if (!r)
                return this.error(
                    expr,
                    `role ${role.getName()} has no member ${id}`
                )
            return r
        }

        return this.error(expr, `unhandled member ${idName(expr.property)}`)

        function isRegister(pi: jdspec.PacketInfo) {
            return pi.kind == "ro" || pi.kind == "rw" || pi.kind == "const"
        }

        function isEvent(pi: jdspec.PacketInfo) {
            return pi.kind == "event"
        }

        function matchesSpecName(pi: jdspec.PacketInfo, id: string) {
            return pi.name == id // TODO camelize
        }
    }

    private emitLiteral(expr: estree.Literal): ValueDesc {
        return this.error(expr, "unhandled literal")
    }

    private emitAssignmentExpression(
        expr: estree.AssignmentExpression
    ): ValueDesc {
        return this.error(expr, "unhandled assignment")
    }

    private emitBinaryExpression(expr: estree.BinaryExpression): ValueDesc {
        return this.error(expr, "unhandled operator")
    }

    private emitUnaryExpression(expr: estree.UnaryExpression): ValueDesc {
        return this.error(expr, "unhandled operator")
    }

    private expectExpr(expr: estree.Expression, kind: ValueKind): ValueDesc {
        const r = this.emitExpr(expr)
        if (r.kind != kind && r.kind != ValueKind.ERROR)
            return this.error(
                expr,
                `expecting ${stringifyValueKind(
                    kind
                )}; got ${stringifyValueKind(r.kind)}`
            )
        return r
    }

    private emitExpr(expr: estree.Expression | estree.Super): ValueDesc {
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
                return this.error(expr, "unhandled expr: " + expr.type)
        }
    }

    private emitStmt(stmt: estree.BaseStatement) {
        if (stmt.range) {
            let [startp, endp] = stmt.range
            if (endp === undefined) endp = startp + 60
            endp = Math.min(endp, startp + 60)
            const src = this.source.slice(startp, endp).replace(/\n[^]*/, "...")
            this.writer.emitComment(src)
        }

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
                this.error(stmt, `unhandled type: ${stmt.type}`)
        }
    }

    emit() {
        try {
            this.tree = esprima.parseScript(this.source, {
                // tolerant: true,
                range: true,
            })
        } catch (e) {
            if (e.description) this.error([e.index], e.description)
            else throw e
            return
        }

        this.emitProgram(this.tree)
    }
}

new Program(sample).emit()

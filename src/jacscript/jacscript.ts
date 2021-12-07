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

const sample = `
var btnA = role(services.button)
var color = role(services.color)
var led = role(services.ledpixel)
var r, g, b, tint

btnA.down.event(() => {
  color.enabled = true
  led.color = 0x00ff00
  wait(0.3)
  [r, g, b] = color.reading
  tint = (r + g + 2 * b) / log(r + g + b)
  upload("color", r, g, b, tint)
  display.text = format("t={0} {1}", tint, r)
  led.color = 0
  color.enabled = false
})
`

class Cell {
    constructor(public definition: estree.BaseNode) {}
    value(): ValueDesc {
        assert(false)
        return null
    }
}

class Role extends Cell {
    constructor(
        definition: estree.VariableDeclarator,
        public spec: jdspec.ServiceSpec,
        public index: number
    ) {
        super(definition)
    }
}

class Variable extends Cell {
    isLocal = false

    constructor(definition: estree.VariableDeclarator, public index: number) {
        super(definition)
    }
    value(): ValueDesc {
        return {
            kind: this.isLocal ? ValueKind.LOCAL : ValueKind.GLOBAL,
            index: this.index,
        }
    }
}

interface ValueDesc {
    kind: ValueKind
    index: number
}

function assert(cond: boolean) {
    if (!cond) throw new Error("assertion failed")
}

const values = {
    zero: { kind: ValueKind.SMALL_INT, index: 0 },
}

class OpWriter {
    allocatedRegs: ValueDesc[] = []
    allocatedRegsMask = 0
    scopes: ValueDesc[][] = []
    binary: number[] = []

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
        const r = {
            kind: ValueKind.REG,
            index: regno,
        }
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

    arg16(v: ValueDesc) {
        assert(v.index >= 0)
        if (v.kind == ValueKind.SMALL_INT) {
            assert(v.index <= 0x7fff)
            return 0x8000 | v.index
        } else {
            assert(v.index <= 0x0fff)
            return (v.kind << 12) | v.index
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

    emitInstr(v: number) {
        this.binary.push(v >>> 0)
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

class Program {
    roles: Role[] = []
    globalVars: Variable[] = []
    tree: estree.Program
    globals: SMap<Cell> = {}
    globalIdx = 0
    localIdx = 0
    writer = new OpWriter()

    constructor(public source: string) {}

    indexToPos(idx: number) {
        const s = this.source.slice(0, idx)
        const ln = s.replace(/[^\n]/g, "").length + 1
        const col = s.replace(/.*\n/, "").length + 1
        return `(${ln},${col})`
    }

    error(range: number[] | estree.BaseNode, msg: string): any {
        if (!Array.isArray(range)) range = range.range
        console.error(`${this.indexToPos(range[0])}: ${msg}`)
        return null
    }

    private idName(pat: estree.BaseExpression) {
        if (pat.type != "Identifier") return null
        return (pat as estree.Identifier).name
    }

    private forceName(pat: estree.Expression | estree.Pattern) {
        const r = this.idName(pat)
        if (!r) this.error(pat, "only simple identifiers supported")
        return (pat as estree.Identifier).name
    }

    private parseRole(decl: estree.VariableDeclarator) {
        const expr = decl.init
        if (expr?.type != "CallExpression") return null
        if (this.idName(expr.callee) != "role") return null
        if (expr.arguments.length != 1)
            return this.error(expr, "role() expects 1 argument")
        const arg = expr.arguments[0]
        let serv = ""
        if (arg.type == "MemberExpression") {
            if (this.idName(arg.object) == "services")
                serv = this.forceName(arg.property)
        } else if (this.idName(arg)) {
            serv = this.idName(arg)
        }

        if (!serv)
            this.error(arg, "role() expects 'services.something' as argument")

        const spec = serviceSpecificationFromName(serv)
        if (!spec) return this.error(arg, "no such service: " + serv)
        const r = new Role(decl, spec, this.roles.length)
        this.roles.push(r)
        return r
    }

    private emitStore(trg: Variable, src: ValueDesc) {
        this.writer.emitUnary(OpUnary.ID, trg.value(), src)
    }

    private emitVariableDeclaration(decls: estree.VariableDeclaration) {
        if (decls.kind != "var") this.error(decls, "only 'var' supported")
        for (const decl of decls.declarations) {
            const id = this.forceName(decl.id)
            const r = this.parseRole(decl)
            if (r) {
                this.globals[id] = r
            } else {
                const g = new Variable(decl, this.globalIdx++)
                this.globals[id] = g
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

    private emitExpr(expr: estree.Expression): ValueDesc {
        return null
        // switch (expr.type) {}
    }

    private emitStmt(stmt: estree.BaseStatement) {
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

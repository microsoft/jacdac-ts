/*

- FORMAT should maybe set the buffer size?
- get_reg option to return immediately

*/

export enum BinFmt {
    Magic0 = 0x5363614a,
    Magic1 = 0x9a6a7e0a,
    FixHeaderSize = 64,
    SectionHeaderSize = 8,
    FunctionHeaderSize = 16,
    RoleHeaderSize = 8,
}

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
    CALL = 10, // NUMREGS[4] OPCALL[2] B:OFF[6] (D - saved regs)

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
    FORMAT, // A-string-index B-numargs C-offset
    MEMCPY, // A-string-index C-offset
    _LAST,
}

export enum OpCall {
    SYNC = 0,
    BG = 1,
    BG_MAX1 = 2,
    RESERVED = 3,
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
    _LAST,
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
    _LAST,
}

export enum OpUnary {
    ID = 0x0,
    NEG = 0x1,
    NOT = 0x2,
    _LAST,
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

export function isPrefixInstr(instr: number) {
    const op = instr >>> 12
    return op <= OpTop.SET_HIGH
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

    if (!isPrefixInstr(instr)) params = [0, 0, 0, 0]
    if (resolver) resolver.resolverParams = params

    return res

    function doOp() {
        switch (op) {
            case OpTop.SET_A: // ARG[12]
            case OpTop.SET_B: // ARG[12]
            case OpTop.SET_C: // ARG[12]
            case OpTop.SET_D: // ARG[12]
                params[op] = arg12
                return `[${abcd[op]} 0x${arg12.toString(16)}] `

            case OpTop.SET_HIGH: // A/B/C/D[2] ARG[10]
                params[arg12 >> 10] |= arg10 << 12
                return `[upper ${abcd[arg12 >> 10]} 0x${arg10.toString(16)}] `

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
                    `jump ${arg8 & (1 << 7) ? "-" : "+"}${b}` +
                    (arg8 & (1 << 6) ? ` if ${reg0} == 0` : ``)
                )

            case OpTop.CALL: // NUMREGS[4] OPCALL[2] B:OFF[6] (D - saved regs)
                b = (b << 6) | arg6
                return `call${callop()} ${
                    resolver.funName(b) || ""
                }_F${b} #${subop} save=${d.toString(2)}`

            case OpTop.SYNC: // A:ARG[4] OP[8]
                a = (a << 4) | subop
                return `sync ${syncOp()}`

            case OpTop.ASYNC: // D:SAVE_REGS[4] OP[8]
                d = (d << 4) | subop
                return `async ${asyncOp()} save=${d.toString(2)}`
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

    function callop() {
        switch (arg8 >> 6) {
            case OpCall.SYNC:
                return ""
            case OpCall.BG:
                return " bg"
            case OpCall.BG_MAX1:
                return " bg (max1)"
            case OpCall.RESERVED:
                return " ???"
        }
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
                return `C${a}[${idx}]` // ??
        }
    }

    function syncOp() {
        switch (arg8) {
            case OpSync.RETURN:
                return `return`
            case OpSync.SETUP_BUFFER: // A-size
                return `setup_buffer(size=${a})`
            case OpSync.OBSERVE_ROLE: // A-role
                return `observe(${role()})`
            case OpSync.FORMAT: // A-string-index B-numargs
                return `format(str=${a} #${b})`
            case OpSync.MEMCPY: // A-string-index
                return `memcpy(str=${a})`
            default:
                return `Sync_0x${arg8.toString(16)}`
        }
    }

    function asyncOp() {
        switch (arg8) {
            case OpAsync.YIELD: // A-timeout in ms
                return `yield(wait=${a}ms)`
            case OpAsync.CLOUD_UPLOAD: // A-numregs
                return `upload(#${a})`
            case OpAsync.QUERY_REG: // A-role, B-code, C-timeout
                return `query(${jdreg()} timeout=${c}ms)`
            case OpAsync.SET_REG: // A-role, B-code
                return `set(${jdreg()})`
            default:
                return `Async_0x${arg8.toString(16)}`
        }
    }
}

export interface FunctionDebugInfo {
    name: string
    // format is (line-number, start, len)
    // start is offset in halfwords from the start of the function
    // len is in halfwords
    srcmap: number[]
    locals: CellDebugInfo[]
}

export interface CellDebugInfo {
    name: string
}

export interface DebugInfo {
    functions: FunctionDebugInfo[]
    roles: CellDebugInfo[]
    globals: CellDebugInfo[]
    source: string
}

export function emptyDebugInfo(): DebugInfo {
    return {
        functions: [],
        globals: [],
        roles: [],
        source: "",
    }
}

import { JDBus, JDDevice, JDRegister, JDService } from "../jacdac"
import { NumberFormat, setNumber } from "../jdom/buffer"
import {
    CMD_GET_REG,
    DEVICE_DISCONNECT,
    PACKET_PROCESS,
    SELF_ANNOUNCE,
} from "../jdom/constants"
import { jdunpack } from "../jdom/pack"
import { Packet } from "../jdom/packet"
import {
    fromUTF8,
    range,
    read16,
    read32,
    stringToUint8Array,
    toUTF8,
    uint8ArrayToString,
    write16,
    write32,
} from "../jdom/utils"
import {
    BinFmt,
    bitSize,
    CellDebugInfo,
    CellKind,
    DebugInfo,
    emptyDebugInfo,
    FunctionDebugInfo,
    InstrArgResolver,
    isPrefixInstr,
    NUM_REGS,
    OpAsync,
    OpBinary,
    OpCall,
    OpFmt,
    OpSync,
    OpTop,
    OpUnary,
    SMap,
    stringifyCellKind,
    stringifyInstr,
    ValueSpecial,
} from "./format"
import { strformat } from "./strformat"

const MAX_STEPS = 128 * 1024

export function oopsPos(pos: number, msg: string): never {
    throw new Error(`verification error at ${hex(pos)}: ${msg}`)
}

export function assertPos(pos: number, cond: boolean, msg: string) {
    if (!cond) oopsPos(pos, msg)
}

export function hex(n: number) {
    return "0x" + n.toString(16)
}

export class BinSection {
    constructor(public buf: Uint8Array, public offset: number) {
        assertPos(offset, (offset & 3) == 0, "binsect: offset aligned")
        assertPos(offset, this.end <= this.buf.length, "binsect: end <= len")
    }

    toString() {
        return `[${hex(this.start)}:${hex(this.end)}]`
    }

    get start() {
        return read32(this.buf, this.offset)
    }

    get end() {
        return this.start + this.length
    }

    get length() {
        return read32(this.buf, this.offset + 4)
    }

    asBuffer() {
        return this.buf.slice(this.start, this.end).buffer
    }

    mustContain(pos: number, off: number | BinSection) {
        if (typeof off == "number") {
            if (this.start <= off && off <= this.end) return
            oopsPos(pos, `${hex(off)} falls outside of ${this}`)
        } else {
            this.mustContain(pos, off.start)
            this.mustContain(pos, off.end)
        }
    }
}

export function loadImage(bin: Uint8Array) {
    const hd = bin.slice(0, BinFmt.FixHeaderSize)

    const [magic0, magic1, numGlobals] = jdunpack(
        hd.slice(0, 10),
        "u32 u32 u16"
    )

    assertPos(0, magic0 == BinFmt.Magic0, "magic 0")
    assertPos(4, magic1 == BinFmt.Magic1, "magic 1")

    const sects = range(6).map(
        idx =>
            new BinSection(
                bin,
                BinFmt.FixHeaderSize + BinFmt.SectionHeaderSize * idx
            )
    )

    const [funDesc, funData, floatData, roleData, strDesc, strData] = sects

    return {
        funDesc,
        funData,
        floatData,
        roleData,
        strDesc,
        strData,
        sects,
        numGlobals,
    }
}

class RoleInfo {
    constructor(
        public parent: ImageInfo,
        public offset: number,
        public dbg: CellDebugInfo
    ) {}
    get classId() {
        return read32(this.parent.bin, this.offset)
    }
}

export class FunctionInfo {
    startPC: number
    numLocals: number
    numRegs: number

    constructor(
        bin: Uint8Array,
        public offset: number,
        public dbg: FunctionDebugInfo
    ) {
        const [start, _len, numLocals, numRegs, _flags] = jdunpack(
            bin.slice(offset, offset + 12),
            "u32 u32 u16 u8 u8"
        )
        this.startPC = start >> 1
        this.numLocals = numLocals
        this.numRegs = numRegs
    }
}

class ImageInfo {
    floatLiterals: Float64Array
    stringLiterals: Uint8Array[]
    roles: RoleInfo[]
    functions: FunctionInfo[]
    code: Uint16Array
    numGlobals: number

    constructor(
        public bin: Uint8Array,
        public dbg: DebugInfo = emptyDebugInfo()
    ) {
        const {
            funDesc,
            funData,
            floatData,
            roleData,
            strDesc,
            strData,
            sects,
            numGlobals,
        } = loadImage(bin)
        this.code = new Uint16Array(this.bin.buffer)
        this.floatLiterals = new Float64Array(floatData.asBuffer())

        this.numGlobals = numGlobals

        this.functions = []
        for (
            let ptr = funDesc.start;
            ptr < funDesc.end;
            ptr += BinFmt.FunctionHeaderSize
        ) {
            this.functions.push(
                new FunctionInfo(
                    this.bin,
                    ptr,
                    dbg.functions[this.functions.length]
                )
            )
        }

        this.stringLiterals = []
        for (
            let ptr = strDesc.start;
            ptr < strDesc.end;
            ptr += BinFmt.SectionHeaderSize
        ) {
            const strSect = new BinSection(bin, ptr)
            this.stringLiterals.push(new Uint8Array(strSect.asBuffer()))
        }

        this.roles = []
        for (
            let ptr = roleData.start;
            ptr < roleData.end;
            ptr += BinFmt.RoleHeaderSize
        ) {
            this.roles.push(
                new RoleInfo(this, ptr, dbg.roles[this.roles.length])
            )
        }
    }
}

function oops(): never {
    throw new Error()
}

function unop(op: OpUnary, v: number) {
    switch (op) {
        case OpUnary.ID:
            return v
        case OpUnary.NEG:
            return -v
        case OpUnary.NOT:
            return v ? 0 : 1
        default:
            oops()
    }
}

function binop(op: OpBinary, a: number, b: number) {
    switch (op) {
        case OpBinary.ADD:
            return a + b
        case OpBinary.SUB:
            return a - b
        case OpBinary.DIV:
            return a / b
        case OpBinary.MUL:
            return a * b
        case OpBinary.LT:
            return a < b ? 1 : 0
        case OpBinary.LE:
            return a <= b ? 1 : 0
        case OpBinary.EQ:
            return a == b ? 1 : 0
        case OpBinary.NE:
            return a != b ? 1 : 0
        case OpBinary.AND:
            return a && b ? 1 : 0
        case OpBinary.OR:
            return a || b ? 1 : 0
        default:
            oops()
    }
}

const numfmts = [
    NumberFormat.UInt8LE,
    NumberFormat.UInt16LE,
    NumberFormat.UInt32LE,
    NumberFormat.UInt64LE,
    NumberFormat.Int8LE,
    NumberFormat.Int16LE,
    NumberFormat.Int32LE,
    NumberFormat.Int64LE,
]
function toNumberFormat(opfmt: OpFmt) {
    const r = numfmts[opfmt]
    if (r === undefined) {
        if (opfmt == OpFmt.F32) return NumberFormat.Float32LE
        if (opfmt == OpFmt.F64) return NumberFormat.Float64LE
        oops()
    }
    return r
}

function shiftVal(n: number) {
    if (n <= 31) return 1 << n
    let r = 1 << 31
    n -= 31
    while (n--) r *= 2
    return r
}

function nanify(v: number) {
    if (v == null) return NaN
    if (isNaN(v)) return NaN
    return v
}

function loadCell(
    ctx: Ctx,
    act: Activation,
    tp: CellKind,
    idx: number,
    c: number
) {
    switch (tp) {
        case CellKind.LOCAL:
            return act.locals[idx]
        case CellKind.GLOBAL:
            return ctx.globals[idx]
        case CellKind.BUFFER: // arg=shift:numfmt, C=Offset
            const v = ctx.pkt.getNumber(toNumberFormat(idx & 0xf), c)
            if (v === undefined) return NaN
            return v / shiftVal(idx >> 4)
        case CellKind.FLOAT_CONST:
            return ctx.info.floatLiterals[idx]
        case CellKind.IDENTITY:
            return idx
        case CellKind.SPECIAL:
            switch (idx) {
                case ValueSpecial.NAN:
                    return NaN
                case ValueSpecial.SIZE:
                    return ctx.pkt.size
                case ValueSpecial.EV_CODE:
                    return nanify(ctx.pkt.eventCode)
                case ValueSpecial.REG_CODE:
                    return nanify(ctx.pkt.registerIdentifier)
                case ValueSpecial.ROLE_ID:
                    return nanify(ctx.wakeRoleIdx)
                default:
                    oops()
            }
        default:
            oops()
    }
}

function clamp(nfmt: OpFmt, v: number) {
    const sz = bitSize(nfmt)
    
    if (nfmt <= OpFmt.U64) {
        v = Math.round(v)
        if (v < 0) return 0
        const max = shiftVal(sz) - 1
        if (v > max) return max
        return v
    }

    if (nfmt <= OpFmt.I64) {
        v = Math.round(v)
        const min = -shiftVal(sz - 1)
        if (v < min) return min
        const max = -min - 1
        if (v > max) return max
        return v
    }

    // no clamping for floats
    return v
}

function storeCell(
    ctx: Ctx,
    act: Activation,
    tp: CellKind,
    idx: number,
    c: number,
    val: number
) {
    switch (tp) {
        case CellKind.LOCAL:
            act.locals[idx] = val
            break
        case CellKind.GLOBAL:
            ctx.globals[idx] = val
            break
        case CellKind.BUFFER: // arg=shift:numfmt, C=Offset
            setNumber(
                ctx.pkt.data,
                toNumberFormat(idx & 0xf),
                c,
                clamp(idx & 0xf, val * shiftVal(idx >> 4))
            )
            break
        default:
            oops()
    }
}

function strFormat(fmt: Uint8Array, args: Float64Array) {
    return stringToUint8Array(strformat(uint8ArrayToString(fmt), args))
}

class Activation {
    locals: Float64Array
    savedRegs: number
    pc: number

    constructor(
        public fiber: Fiber,
        public info: FunctionInfo,
        public caller: Activation
    ) {
        this.locals = new Float64Array(info.numLocals + info.numRegs)
        this.pc = info.startPC
    }

    saveArgs(n: number) {
        this.saveRegs((1 << n) - 1)
    }

    private saveRegs(d: number) {
        let p = 0
        const r = this.fiber.ctx.registers
        for (let i = 0; i < NUM_REGS; i++) {
            if ((1 << i) & d) {
                if (p >= this.info.numRegs) oops()
                this.locals[this.info.numLocals + p] = r[i]
                p++
            }
        }
        this.savedRegs = d
    }

    restoreRegs() {
        if (this.savedRegs == 0) return
        const r = this.fiber.ctx.registers
        let p = 0
        for (let i = 0; i < NUM_REGS; i++) {
            if ((1 << i) & this.savedRegs) {
                r[i] = this.locals[this.info.numLocals + p]
                p++
            }
        }
        this.savedRegs = 0
    }

    private callFunction(info: FunctionInfo, numargs: number) {
        const callee = new Activation(this.fiber, info, this)
        this.fiber.activate(callee)
    }

    private returnFromCall() {
        this.fiber.activate(this.caller)
    }

    step() {
        const ctx = this.fiber.ctx
        const instr = ctx.info.code[this.pc++]

        const op = instr >> 12
        const arg12 = instr & 0xfff
        const arg10 = instr & 0x3ff
        const arg8 = instr & 0xff
        const arg6 = instr & 0x3f
        const arg4 = instr & 0xf
        const subop = arg12 >> 8

        const reg0 = subop
        const reg1 = arg8 >> 4
        const reg2 = arg4

        let [a, b, c, d] = ctx.params

        switch (op) {
            case OpTop.LOAD_CELL:
            case OpTop.STORE_CELL:
            case OpTop.JUMP:
            case OpTop.CALL:
                b = (b << 6) | arg6
                break
        }

        switch (op) {
            case OpTop.LOAD_CELL:
            case OpTop.STORE_CELL:
                a = (a << 2) | (arg8 >> 6)
                break
        }

        switch (op) {
            case OpTop.SET_A:
            case OpTop.SET_B:
            case OpTop.SET_C:
            case OpTop.SET_D:
                ctx.params[op] = arg12
                break

            case OpTop.SET_HIGH:
                ctx.params[arg12 >> 10] |= arg10 << 12
                break

            case OpTop.UNARY: // OP[4] DST[4] SRC[4]
                ctx.registers[reg1] = unop(subop, ctx.registers[reg2])
                break

            case OpTop.BINARY: // OP[4] DST[4] SRC[4]
                ctx.registers[reg1] = binop(
                    subop,
                    ctx.registers[reg1],
                    ctx.registers[reg2]
                )
                break

            case OpTop.LOAD_CELL: // DST[4] A:OP[2] B:OFF[6]
                ctx.registers[reg1] = loadCell(ctx, this, a, b, c)
                break

            case OpTop.STORE_CELL: // SRC[4] A:OP[2] B:OFF[6]
                storeCell(ctx, this, a, b, c, ctx.registers[reg1])
                break

            case OpTop.JUMP: // REG[4] BACK[1] IF_ZERO[1] B:OFF[6]
                if (arg8 & (1 << 6) && ctx.registers[reg0]) break
                if (arg8 & (1 << 7)) {
                    this.pc -= b
                } else {
                    this.pc += b
                }
                break

            case OpTop.CALL: // NUMREGS[4] OPCALL[2] B:OFF[6] (D - saved regs)
                this.saveRegs(d)
                const finfo = ctx.info.functions[b]
                switch (arg8 >> 2) {
                    case OpCall.SYNC:
                        this.callFunction(finfo, subop)
                        break
                    case OpCall.BG:
                        ctx.startFiber(finfo, subop, true)
                        break
                    case OpCall.BG_MAX1:
                        ctx.startFiber(finfo, subop, true)
                        break
                    default:
                        oops()
                }
                break

            case OpTop.SYNC: // A:ARG[4] OP[8]
                a = (a << 4) | subop
                switch (arg8) {
                    case OpSync.RETURN:
                        this.returnFromCall()
                        break
                    case OpSync.SETUP_BUFFER: // A-size
                        ctx.pkt.data = new Uint8Array(a)
                        break
                    case OpSync.OBSERVE_ROLE: // A-role
                        const r = ctx.roles[a]
                        this.fiber.waitingOn.push(r)
                        break
                    case OpSync.FORMAT: // A-string-index B-numargs C-offset
                        ctx.setBuffer(
                            strFormat(
                                ctx.info.stringLiterals[a],
                                ctx.registers.slice(0, b)
                            ),
                            c
                        )
                        break
                    case OpSync.MEMCPY: // A-string-index C-offset
                        ctx.setBuffer(ctx.info.stringLiterals[a], c)
                        break
                    default:
                        oops()
                        break
                }
                break

            case OpTop.ASYNC: // D:SAVE_REGS[4] OP[8]
                d = (d << 4) | subop
                this.saveRegs(d)
                switch (arg8) {
                    case OpAsync.YIELD: // A-timeout in ms
                        if (a) this.fiber.wakeTime = ctx.now() + a
                        else this.fiber.wakeTime = null
                        ctx.doYield()
                        break
                    case OpAsync.CLOUD_UPLOAD: // A-numregs
                        ctx.cloudUpload(a)
                        break
                    case OpAsync.SET_REG: // A-role, B-code
                        ctx.setReg(ctx.roles[a], b)
                        break
                    case OpAsync.QUERY_REG: // A-role, B-code, C-timeout
                        ctx.getReg(ctx.roles[a], b, c)
                        break
                    default:
                        oops()
                        break
                }
                break
        }

        if (!isPrefixInstr(instr)) ctx.params.fill(0)
    }
}

class Fiber {
    waitingOn: Role[]
    wakeTime: number
    waitingOnGet: Role
    waitingOnGetCode: number
    activation: Activation
    firstFun: FunctionInfo

    constructor(public ctx: Ctx) {}

    resume() {
        this.wakeTime = 0
        this.waitingOn = []
        this.ctx.currentFiber = this
        this.activate(this.activation)
    }

    activate(a: Activation) {
        this.activation = a
        this.ctx.currentActivation = a
        a.restoreRegs()
    }

    sleep(ms: number) {
        this.wakeTime = this.ctx.now() + ms
        this.ctx.doYield()
    }
}

class Role {
    device: JDDevice
    serviceIndex: number
    awaiters: (() => void)[] = []

    constructor(public info: RoleInfo) {}

    service() {
        if (!this.device) return null
        return this.device.service(this.serviceIndex)
    }

    serviceAsync() {
        const s = this.service()
        if (s) return Promise.resolve(s)
        return new Promise<JDService>(resolve => {
            this.awaiters.push(() => resolve(this.service()))
        })
    }

    assign(d: JDDevice, idx: number) {
        this.device = d
        this.serviceIndex = idx
        if (this.awaiters.length) {
            const aa = this.awaiters
            this.awaiters = []
            for (const a of aa) a()
        }
    }
}

class Ctx {
    pkt: Packet
    wakeRoleIdx: number
    registers = new Float64Array(NUM_REGS)
    params = new Uint16Array(4)
    globals: Float64Array
    currentFiber: Fiber
    fibers: Fiber[] = []
    currentActivation: Activation
    roles: Role[]
    wakeTimeout: any

    constructor(public info: ImageInfo, public bus: JDBus) {
        this.globals = new Float64Array(this.info.numGlobals)
        this.roles = info.roles.map(r => new Role(r))
        bus.on(DEVICE_DISCONNECT, this.deviceDisconnect.bind(this))
        bus.on(SELF_ANNOUNCE, () => this.autoBind(bus.devices()))
        bus.on(PACKET_PROCESS, this.processPkt.bind(this))
        this.checkWakeTimes = this.checkWakeTimes.bind(this)
    }

    now() {
        return this.bus.timestamp
    }

    startProgram() {
        this.startFiber(this.info.functions[0], 0, false)
    }

    private scheduleCheckWakeTimes() {
        if (this.wakeTimeout !== undefined) {
            this.bus.scheduler.clearTimeout(this.wakeTimeout)
            this.wakeTimeout = undefined
        }

        let minTime = Infinity
        for (const f of this.fibers) {
            if (f.wakeTime) minTime = Math.min(f.wakeTime, minTime)
        }
        if (minTime < Infinity) {
            const delta = Math.max(0, minTime - this.now())
            this.wakeTimeout = this.bus.scheduler.setTimeout(
                this.checkWakeTimes,
                delta
            )
        }
    }

    run(f: Fiber) {
        f.resume()
        let maxSteps = MAX_STEPS
        while (this.currentActivation) {
            this.currentActivation.step()
            if (!--maxSteps) throw new Error("execution timeout")
        }
    }

    private checkWakeTimes() {
        const n = this.now()
        let numRun = 0
        for (const f of this.fibers)
            if (f.wakeTime && n >= f.wakeTime) {
                numRun++
                this.run(f)
            }
        if (numRun) this.scheduleCheckWakeTimes()
    }

    private deviceDisconnect(dev: JDDevice) {
        for (const r of this.roles) {
            if (r.device == dev) {
                r.assign(null, 0)
            }
        }
    }

    private autoBind(devs: JDDevice[]) {
        // TODO make it sort roles etc
        // TODO prevent two roles binding to the same service idx
        for (const r of this.roles) {
            if (!r.device)
                for (const d of devs) {
                    if (d.hasService(r.info.classId)) {
                        r.assign(d, d.serviceClasses.indexOf(r.info.classId))
                    }
                }
        }
    }

    private processPkt(pkt: Packet) {
        this.pkt = pkt
        let idx = 0
        let numRun = 0
        for (const r of this.roles) {
            if (r.device == pkt.device && r.serviceIndex == pkt.serviceIndex) {
                for (const f of this.fibers)
                    if (f.waitingOn.indexOf(r) >= 0) {
                        this.wakeRoleIdx = idx
                        this.run(f)
                        this.wakeRoleIdx = null
                        numRun++
                    }
            }
            idx++
        }
        if (numRun) this.scheduleCheckWakeTimes()
    }

    doYield() {
        const f = this.currentFiber
        this.currentFiber = null
        this.currentActivation = null
        return f
    }

    startFiber(info: FunctionInfo, numargs: number, max1: boolean) {
        if (numargs > info.numRegs) oops()
        if (max1)
            for (const f of this.fibers) {
                if (f.firstFun == info) return
            }
        const fiber = new Fiber(this)
        fiber.activation = new Activation(fiber, info, null)
        fiber.activation.saveArgs(numargs)
        fiber.firstFun = info
        fiber.wakeTime = this.now()
        this.fibers.push(fiber)
    }

    private pktLabel() {
        return fromUTF8(uint8ArrayToString(this.pkt.data))
    }

    cloudUpload(numargs: number) {
        const regs = this.registers.slice(0, numargs).join(", ")
        console.log(`upload: ${this.pktLabel()} ${regs}`)
        // TODO do actual upload
        this.currentFiber.sleep(50 + Math.random() * 50)
    }

    setBuffer(b: Uint8Array, off: number) {
        if (off > 236) return
        if (b.length + off > 236) b = b.slice(0, 236 - off)
        const pkt = this.pkt
        if (b.length + off > pkt.size) {
            const tmp = new Uint8Array(b.length + off)
            tmp.set(pkt.data)
            tmp.set(b, off)
            pkt.data = tmp
        } else {
            pkt.data.set(b, off)
        }
    }

    setReg(r: Role, code: number) {
        const fib = this.doYield()
        const val = this.pkt.data.slice()
        r.serviceAsync().then(serv => {
            serv.register(code).sendSetAsync(val)
            this.run(fib)
        })
    }

    getReg(r: Role, code: number, timeout: number) {
        const setPkt = (reg: JDRegister) => {
            this.pkt = Packet.from(CMD_GET_REG | code, reg.data)
            this.pkt.deviceIdentifier = r.device.deviceId
            this.pkt.serviceIndex = r.serviceIndex
        }

        const reg = r.service()?.register(code)
        const ts = reg?.lastDataTimestamp

        if (ts && this.bus.timestamp - ts < timeout) {
            setPkt(reg)
            return
        }

        const fib = this.doYield()
        r.serviceAsync().then(serv => {
            const reg = serv.register(code)
            reg.refresh().then(() => {
                setPkt(reg)
                this.run(fib)
            })
        })
    }
}

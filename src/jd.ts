import * as U from "./pxtutils"

// Registers 0x001-0x07f - r/w common to all services
// Registers 0x080-0x0ff - r/w defined per-service
// Registers 0x100-0x17f - r/o common to all services
// Registers 0x180-0x1ff - r/o defined per-service
// Registers 0x200-0xeff - custom, defined per-service
// Registers 0xf00-0xfff - reserved for implementation, should not be on the wire

// this is either binary (0 or non-zero), or can be gradual (eg. brightness of neopixel)
export const REG_INTENSITY = 0x01
// the primary value of actuator (eg. servo angle)
export const REG_VALUE = 0x02
// enable/disable streaming
export const REG_IS_STREAMING = 0x03
// streaming interval in miliseconds
export const REG_STREAMING_INTERVAL = 0x04
// for analog sensors
export const REG_LOW_THRESHOLD = 0x05
export const REG_HIGH_THRESHOLD = 0x06
// limit power drawn; in mA
export const REG_MAX_POWER = 0x07

// eg. one number for light sensor, all 3 coordinates for accelerometer
export const REG_READING = 0x101

export const CMD_GET_REG = 0x1000
export const CMD_SET_REG = 0x2000

export const CMD_TOP_MASK = 0xf000
export const CMD_REG_MASK = 0x0fff


// Commands 0x000-0x07f - common to all services
// Commands 0x080-0xeff - defined per-service
// Commands 0xf00-0xfff - reserved for implementation
// enumeration data for CTRL, ad-data for other services
export const CMD_ADVERTISEMENT_DATA = 0x00
// event from sensor or on broadcast service
export const CMD_EVENT = 0x01
// request to calibrate sensor
export const CMD_CALIBRATE = 0x02
// request human-readable description of service
export const CMD_GET_DESCRIPTION = 0x03

// Commands specific to control service
// do nothing
export const CMD_CTRL_NOOP = 0x80
// blink led or otherwise draw user's attention
export const CMD_CTRL_IDENTIFY = 0x81
// reset device
export const CMD_CTRL_RESET = 0x82

export const STREAM_PORT_SHIFT = 7
export const STREAM_COUNTER_MASK = 0x001f
export const STREAM_CLOSE_MASK = 0x0020
export const STREAM_METADATA_MASK = 0x0040

export const JD_SERIAL_HEADER_SIZE = 16
export const JD_SERIAL_MAX_PAYLOAD_SIZE = 236
export const JD_SERVICE_NUMBER_MASK = 0x3f
export const JD_SERVICE_NUMBER_INV_MASK = 0xc0
export const JD_SERVICE_NUMBER_CRC_ACK = 0x3f
export const JD_SERVICE_NUMBER_STREAM = 0x3e
export const JD_SERVICE_NUMBER_CTRL = 0x00

// the COMMAND flag signifies that the device_identifier is the recipent
// (i.e., it's a command for the peripheral); the bit clear means device_identifier is the source
// (i.e., it's a report from peripheral or a broadcast message)
export const JD_FRAME_FLAG_COMMAND = 0x01
// an ACK should be issued with CRC of this package upon reception
export const JD_FRAME_FLAG_ACK_REQUESTED = 0x02
// the device_identifier contains target service class number
export const JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS = 0x04

function error(msg: string) {
    throw new Error(msg)
}

function log(msg: string, v?: any) {
    if (v === undefined)
        console.log("JD: " + msg)
    else
        console.log("JD: " + msg, v)
}

function warn(msg: string, v?: any) {
    if (v === undefined)
        console.log("JD-WARN: " + msg)
    else
        console.log("JD-WARN: " + msg, v)
}

function idiv(a: number, b: number) { return ((a | 0) / (b | 0)) | 0 }
function fnv1(data: Uint8Array) {
    let h = 0x811c9dc5
    for (let i = 0; i < data.length; ++i) {
        h = Math.imul(h, 0x1000193) ^ data[i]
    }
    return h
}

function hash(buf: Uint8Array, bits: number) {
    bits |= 0
    if (bits < 1)
        return 0
    const h = fnv1(buf)
    if (bits >= 32)
        return h >>> 0
    else
        return ((h ^ (h >>> bits)) & ((1 << bits) - 1)) >>> 0
}

// 4 letter ID; 0.04%/0.01%/0.002% collision probability among 20/10/5 devices
// 3 letter ID; 1.1%/2.6%/0.05%
// 2 letter ID; 25%/6.4%/1.5%
export function shortDeviceId(devid: string) {
    const h = hash(U.fromHex(devid), 30)
    return String.fromCharCode(0x41 + h % 26) +
        String.fromCharCode(0x41 + idiv(h, 26) % 26) +
        String.fromCharCode(0x41 + idiv(h, 26 * 26) % 26) +
        String.fromCharCode(0x41 + idiv(h, 26 * 26 * 26) % 26)
}

const devices_: Device[] = []
export const deviceNames: U.SMap<string> = {}

let sendPacketFn = (p: Packet) => Promise.resolve(undefined)

export function setSendPacketFn(f: (p: Packet) => Promise<void>) {
    sendPacketFn = f
}

export function getDevices() { return devices_.slice() }

export function getDevice(id: string) {
    let d = devices_.find(d => d.deviceId == id)
    if (!d)
        d = new Device(id)
    return d
}

export class Device {
    services: Uint8Array
    lastSeen: number
    lastServiceUpdate: number
    currentReading: Uint8Array
    private _shortId: string

    constructor(public deviceId: string) {
        devices_.push(this)
    }

    get name() {
        return deviceNames[this.deviceId] || deviceNames[this.shortId]
    }

    get shortId() {
        // TODO measure if caching is worth it
        if (!this._shortId)
            this._shortId = shortDeviceId(this.deviceId)
        return this._shortId;
    }

    toString() {
        return this.shortId + (this.name ? ` (${this.name})` : ``)
    }

    hasService(service_class: number) {
        for (let i = 4; i < this.services.length; i += 4)
            if (U.getNumber(this.services, U.NumberFormat.UInt32LE, i) == service_class)
                return true
        return false
    }

    serviceAt(idx: number) {
        idx <<= 2
        if (!this.services || idx + 4 > this.services.length)
            return undefined
        return U.read32(this.services, idx)
    }

    sendCtrlCommand(cmd: number, payload: Buffer = null) {
        const pkt = !payload ? Packet.onlyHeader(cmd) : Packet.from(cmd, payload)
        pkt.service_number = JD_SERVICE_NUMBER_CTRL
        pkt.sendCmdAsync(this)
    }
}


export class Packet {
    _header: Uint8Array;
    _data: Uint8Array;
    timestamp: number
    dev: Device

    private constructor() { }

    static fromBinary(buf: Uint8Array) {
        const p = new Packet()
        p._header = buf.slice(0, JD_SERIAL_HEADER_SIZE)
        p._data = buf.slice(JD_SERIAL_HEADER_SIZE)
        return p
    }

    static from(service_command: number, data: Uint8Array) {
        const p = new Packet()
        p._header = new Uint8Array(JD_SERIAL_HEADER_SIZE)
        p.data = data
        p.service_command = service_command
        return p
    }

    static onlyHeader(service_command: number) {
        return Packet.from(service_command, new Uint8Array(0))
    }

    toBuffer() {
        return U.bufferConcat(this._header, this._data)
    }

    get device_identifier() {
        return U.toHex(this._header.slice(4, 4 + 8))
    }
    set device_identifier(id: string) {
        const idb = U.fromHex(id)
        if (idb.length != 8)
            error("Invalid id")
        this._header.set(idb, 4)
    }

    get frame_flags() { return this._header[3] }

    get multicommand_class() {
        if (this.frame_flags & JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS)
            return U.read32(this._header, 4)
        return undefined
    }

    get size(): number {
        return this._header[12];
    }

    get requires_ack(): boolean {
        return (this.frame_flags & JD_FRAME_FLAG_ACK_REQUESTED) ? true : false;
    }
    set requires_ack(ack: boolean) {
        if (ack != this.requires_ack)
            this._header[3] ^= JD_FRAME_FLAG_ACK_REQUESTED
    }

    get service_number(): number {
        return this._header[13] & JD_SERVICE_NUMBER_MASK;
    }
    set service_number(service_number: number) {
        if (service_number == null)
            throw new Error("service_number not set")
        this._header[13] = (this._header[13] & JD_SERVICE_NUMBER_INV_MASK) | service_number;
    }

    get service_class(): number {
        if (this.dev)
            return this.dev.serviceAt(this.service_number)
        return undefined
    }

    get crc(): number {
        return U.read16(this._header, 0)
    }

    get service_command(): number {
        return U.read16(this._header, 14)
    }
    set service_command(cmd: number) {
        U.write16(this._header, 14, cmd)
    }

    get is_reg_set() {
        return (this.service_command >> 12) == (CMD_SET_REG >> 12)
    }

    get is_reg_get() {
        return (this.service_command >> 12) == (CMD_GET_REG >> 12)
    }

    get data(): Uint8Array {
        return this._data
    }

    set data(buf: Uint8Array) {
        if (buf.length > JD_SERIAL_MAX_PAYLOAD_SIZE)
            throw Error("Too big")
        this._header[12] = buf.length
        this._data = buf
    }

    get uintData() {
        let buf = this._data
        if (buf.length == 0)
            return undefined
        if (buf.length < 4)
            buf = U.bufferConcat(buf, new Uint8Array(4))
        return U.read32(buf, 0)
    }

    get intData() {
        let fmt: U.NumberFormat
        switch (this._data.length) {
            case 0:
                return undefined
            case 1:
                fmt = U.NumberFormat.Int8LE
                break
            case 2:
            case 3:
                fmt = U.NumberFormat.Int16LE
                break
            default:
                fmt = U.NumberFormat.Int32LE
                break
        }
        return this.getNumber(fmt, 0)
    }

    compress(stripped: Uint8Array[]) {
        if (stripped.length == 0)
            return
        let sz = -4
        for (let s of stripped) {
            sz += s.length
        }
        const data = new Uint8Array(sz)
        this._header.set(stripped[0], 12)
        data.set(stripped[0].slice(4), 0)
        sz = stripped[0].length - 4
        for (let s of stripped.slice(1)) {
            data.set(s, sz)
            sz += s.length
        }
        this._data = data
    }

    withFrameStripped() {
        return U.bufferConcat(this._header.slice(12, 12 + 4), this._data)
    }

    getNumber(fmt: U.NumberFormat, offset: number) {
        return U.getNumber(this._data, fmt, offset)
    }

    get is_command() {
        return !!(this.frame_flags & JD_FRAME_FLAG_COMMAND)
    }

    get is_report() {
        return !this.is_command
    }

    toString(): string {
        let msg = `${this.device_identifier}/${this.service_number}[${this.frame_flags}]: ${this.service_command} sz=${this.size}`
        if (this.size < 20) msg += ": " + U.toHex(this.data)
        else msg += ": " + U.toHex(this.data.slice(0, 20)) + "..."
        return msg
    }

    sendCoreAsync() {
        this._header[2] = this.size + 4
        U.write16(this._header, 0, crc(U.bufferConcat(this._header.slice(2), this._data)))
        return sendPacketFn(this)
    }

    sendReportAsync(dev: Device) {
        if (!dev)
            return Promise.resolve()
        this.device_identifier = dev.deviceId
        return this.sendCoreAsync()
    }

    sendCmdAsync(dev: Device) {
        if (!dev)
            return Promise.resolve()
        this.device_identifier = dev.deviceId
        this._header[3] |= JD_FRAME_FLAG_COMMAND
        return this.sendCoreAsync()
    }

    sendAsMultiCommandAsync(service_class: number) {
        this._header[3] |= JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS | JD_FRAME_FLAG_COMMAND
        U.write32(this._header, 4, service_class)
        U.write32(this._header, 8, 0)
        return this.sendCoreAsync()
    }

    static fromFrame(frame: Uint8Array, timestamp: number) {
        return frameToPackets(frame, timestamp)
    }
}

function crc(p: Uint8Array) {
    let crc = 0xffff;
    for (let i = 0; i < p.length; ++i) {
        const data = p[i];
        let x = (crc >> 8) ^ data;
        x ^= x >> 4;
        crc = (crc << 8) ^ (x << 12) ^ (x << 5) ^ x;
        crc &= 0xffff;
    }
    return crc;
}

function ALIGN(n: number) { return (n + 3) & ~3 }

function frameToPackets(frame: Uint8Array, timestamp: number) {
    const size = frame[2] || 0
    if (frame.length < size + 12) {
        warn(`${timestamp}ms: got only ${frame.length} bytes; expecting ${size + 12}`)
    } else if (size < 4) {
        warn(`${timestamp}ms: empty packet`)
    } else {
        const computed = crc(frame.slice(2, size + 12))
        const actual = U.read16(frame, 0)
        if (actual != computed)
            console.log(`crc mismatch; sz=${size} got:${actual}, exp:${computed}`)

        const res: Packet[] = []
        if (frame.length != 12 + frame[2])
            warn(`${timestamp}ms: unexpected packet len: ${frame.length}`)
        for (let ptr = 12; ptr < 12 + frame[2];) {
            const psz = frame[ptr] + 4
            const sz = ALIGN(psz)
            const pkt = U.bufferConcat(frame.slice(0, 12), frame.slice(ptr, ptr + psz))
            if (ptr + sz > 12 + frame[2])
                warn(`${timestamp}ms: invalid frame compression, res len=${res.length}`)
            const p = Packet.fromBinary(pkt)
            p.timestamp = timestamp
            res.push(p)
            ptr += sz
        }

        return res
    }

    return []
}

export function process(pkt: Packet) {
    if (pkt.multicommand_class) {
        //
    } else if (pkt.is_command) {
        pkt.dev = getDevice(pkt.device_identifier)
    } else {
        const dev = pkt.dev = getDevice(pkt.device_identifier)
        dev.lastSeen = pkt.timestamp

        if (pkt.service_number == JD_SERVICE_NUMBER_CTRL) {
            if (pkt.service_command == CMD_ADVERTISEMENT_DATA) {
                if (!U.bufferEq(pkt.data, dev.services)) {
                    dev.services = pkt.data
                    dev.lastServiceUpdate = pkt.timestamp
                    // reattach(dev)
                }
            }
        }
    }
}

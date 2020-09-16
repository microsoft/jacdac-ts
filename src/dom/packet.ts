import { warn, crc, ALIGN, write16, bufferConcat, toHex, fromHex, throwError, read32, read16, write32 } from "./utils";
import {
    JD_FRAME_FLAG_COMMAND,
    JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS,
    CMD_SET_REG,
    JD_SERIAL_HEADER_SIZE,
    JD_FRAME_FLAG_ACK_REQUESTED,
    JD_SERVICE_NUMBER_MASK,
    JD_SERVICE_NUMBER_INV_MASK,
    JD_SERIAL_MAX_PAYLOAD_SIZE,
    CMD_ADVERTISEMENT_DATA,
    CMD_EVENT,
} from "./constants";
import { JDDevice } from "./device";
import { NumberFormat, getNumber } from "./buffer";
import { pack } from "./struct";
import { JDBus } from "./bus";

export class Packet {
    _header: Uint8Array;
    _data: Uint8Array;
    timestamp: number
    dev: JDDevice
    readonly key: number;

    private static _nextKey = 1;
    private constructor() {
        this.key = Packet._nextKey++;
    }

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
        return bufferConcat(this._header, this._data)
    }

    get device_identifier() {
        return toHex(this._header.slice(4, 4 + 8))
    }
    set device_identifier(id: string) {
        const idb = fromHex(id)
        if (idb.length != 8)
            throwError("Invalid id")
        this._header.set(idb, 4)
    }

    get frame_flags() { return this._header[3] }

    get multicommand_class() {
        if (this.frame_flags & JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS)
            return read32(this._header, 4)
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
            return this.dev.serviceClassAt(this.service_number)
        return undefined
    }

    get crc(): number {
        return read16(this._header, 0)
    }

    get service_command(): number {
        return read16(this._header, 14)
    }
    set service_command(cmd: number) {
        write16(this._header, 14, cmd)
    }

    get is_reg_set() {
        return (this.service_command >> 12) == (CMD_SET_REG >> 12)
    }

    get is_reg_get() {
        return (this.service_command >> 12) == (CMD_SET_REG >> 12)
    }

    get is_event() {
        return this.service_command === CMD_EVENT;
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
            buf = bufferConcat(buf, new Uint8Array(4))
        if (buf.length == 8)
            return read32(buf, 0) + read32(buf, 4) * 0x100000000
        return read32(buf, 0)
    }

    get intData() {
        let fmt: NumberFormat
        switch (this._data.length) {
            case 0:
                return undefined
            case 1:
                fmt = NumberFormat.Int8LE
                break
            case 2:
            case 3:
                fmt = NumberFormat.Int16LE
                break
            default:
                fmt = NumberFormat.Int32LE
                break
        }
        return this.getNumber(fmt, 0)
    }

    get isRepeatedAnnounce() {
        return this.dev
            && this.service_number == 0
            && this.service_command == CMD_ADVERTISEMENT_DATA
            && this.dev.lastServiceUpdate < this.timestamp
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
        return bufferConcat(this._header.slice(12, 12 + 4), this._data)
    }

    getNumber(fmt: NumberFormat, offset: number) {
        return getNumber(this._data, fmt, offset)
    }

    get is_command() {
        return !!(this.frame_flags & JD_FRAME_FLAG_COMMAND)
    }

    get is_report() {
        return !this.is_command
    }

    toString(): string {
        let msg = `${this.device_identifier}/${this.service_number}[${this.frame_flags}]: ${this.service_command} sz=${this.size}`
        if (this.size < 20) msg += ": " + toHex(this.data)
        else msg += ": " + toHex(this.data.slice(0, 20)) + "..."
        return msg
    }

    sendCoreAsync(bus: JDBus) {
        this._header[2] = this.size + 4
        write16(this._header, 0, crc(bufferConcat(this._header.slice(2), this._data)))
        return bus.sendPacketAsync(this)
    }

    sendReportAsync(dev: JDDevice) {
        if (!dev)
            return Promise.resolve()
        this.device_identifier = dev.deviceId
        return this.sendCoreAsync(dev.bus)
    }

    sendCmdAsync(dev: JDDevice) {
        if (!dev)
            return Promise.resolve()
        this.device_identifier = dev.deviceId
        this._header[3] |= JD_FRAME_FLAG_COMMAND
        return this.sendCoreAsync(dev.bus)
    }

    sendAsMultiCommandAsync(bus: JDBus, service_class: number) {
        this._header[3] |= JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS | JD_FRAME_FLAG_COMMAND
        write32(this._header, 4, service_class)
        write32(this._header, 8, 0)
        return this.sendCoreAsync(bus)
    }

    static fromFrame(frame: Uint8Array, timestamp: number) {
        return frameToPackets(frame, timestamp)
    }

    static packed(service_command: number, fmt: string, nums: number[]) {
        return Packet.from(service_command, pack(fmt, nums))
    }
}


function frameToPackets(frame: Uint8Array, timestamp: number) {
    const size = frame[2] || 0
    if (frame.length < size + 12) {
        warn(`${timestamp}ms: got only ${frame.length} bytes; expecting ${size + 12}`)
    } else if (size < 4) {
        warn(`${timestamp}ms: empty packet`)
    } else {
        const computed = crc(frame.slice(2, size + 12))
        const actual = read16(frame, 0)
        if (actual != computed)
            console.log(`crc mismatch; sz=${size} got:${actual}, exp:${computed}`)

        const res: Packet[] = []
        if (frame.length != 12 + frame[2])
            warn(`${timestamp}ms: unexpected packet len: ${frame.length}`)
        for (let ptr = 12; ptr < 12 + frame[2];) {
            const psz = frame[ptr] + 4
            const sz = ALIGN(psz)
            const pkt = bufferConcat(frame.slice(0, 12), frame.slice(ptr, ptr + psz))
            if (ptr + sz > 12 + frame[2])
                warn(`${timestamp}ms: invalid frame compression, res len=${res.length}`)
            const p = Packet.fromBinary(pkt)
            p.timestamp = timestamp
            res.push(p)
            // only set req_ack flag on first packet - otherwise we would sent multiple acks
            if (res.length > 1)
                p.requires_ack = false
            ptr += sz
        }

        return res
    }

    return []
}

export default Packet;

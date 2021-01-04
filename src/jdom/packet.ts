import { warn, crc, ALIGN, write16, bufferConcat, toHex, fromHex, throwError, read32, read16, write32, hexNum, bufferToString } from "./utils";
import {
    JD_FRAME_FLAG_COMMAND,
    JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS,
    CMD_SET_REG,
    JD_SERIAL_HEADER_SIZE,
    JD_FRAME_FLAG_ACK_REQUESTED,
    JD_SERVICE_INDEX_MASK,
    JD_SERVICE_INDEX_INV_MASK,
    JD_SERIAL_MAX_PAYLOAD_SIZE,
    CMD_EVENT,
    JD_SERVICE_INDEX_CRC_ACK,
    JD_SERVICE_INDEX_PIPE,
    PIPE_PORT_SHIFT,
    PIPE_COUNTER_MASK,
    PIPE_METADATA_MASK,
    PIPE_CLOSE_MASK,
    CMD_GET_REG,
    JD_SERVICE_INDEX_CTRL,
    CMD_REG_MASK
} from "./constants";
import { JDDevice } from "./device";
import { NumberFormat, getNumber } from "./buffer";
import { JDBus } from "./bus";
import { commandName, DecodedPacket, decodePacketData, serviceName } from "./pretty";
import { SystemCmd } from "../../jacdac-spec/dist/specconstants";
import { jdpack, jdunpack } from "./pack";

export class Packet {
    private _header: Uint8Array;
    private _data: Uint8Array;
    private _meta: any = undefined; // accesory data used by clients
    timestamp: number
    device: JDDevice
    private _decoded: DecodedPacket;
    readonly key: number;
    // An optional tracing identity to avoid
    // resending own packets for bridges
    public sender: string;
    // Replayed in a trace
    public replay?: boolean;

    private static _nextKey = 1;
    private constructor() {
        this.key = Packet._nextKey++;
    }

    static patchBinary(buf: Uint8Array) {
        // sanity-check size
        if (!buf || buf.length > 252)
            return undefined;

        // check if CRC is already set
        if (buf[0] || buf[1] || buf[2])
            return buf;

        // compute CRC, size
        const sz = (buf.length + 3) & ~3
        const data = new Uint8Array(sz)
        data.set(buf)
        data[2] = sz - 12

        const chk = crc(data.slice(2))
        data[0] = chk & 0xff
        data[1] = (chk >> 8) & 0xff

        return data;
    }

    static fromBinary(buf: Uint8Array, timestamp?: number) {
        const data = Packet.patchBinary(buf)
        if (!data)
            return undefined;

        const p = new Packet()
        p._header = data.slice(0, JD_SERIAL_HEADER_SIZE)
        p._data = data.slice(JD_SERIAL_HEADER_SIZE, JD_SERIAL_HEADER_SIZE + p.size);
        if (timestamp !== undefined)
            p.timestamp = timestamp;
        return p
    }

    static from(service_command: number, data: Uint8Array) {
        const p = new Packet()
        p._header = new Uint8Array(JD_SERIAL_HEADER_SIZE)
        p.data = data
        p.serviceCommand = service_command
        return p
    }

    static onlyHeader(service_command: number) {
        return Packet.from(service_command, new Uint8Array(0))
    }

    toBuffer() {
        return bufferConcat(this._header, this._data)
    }

    get header() {
        return this._header.slice(0)
    }

    get deviceIdentifier() {
        return toHex(this._header.slice(4, 4 + 8))
    }
    set deviceIdentifier(id: string) {
        const idb = fromHex(id)
        if (idb.length != 8)
            throwError("Invalid id")
        this._header.set(idb, 4)
        this._decoded = undefined;
    }

    get frameFlags() { return this._header[3] }

    get isMultiCommand() {
        return !!(this.frameFlags & JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS);
    }

    get multicommandClass() {
        if (this.isMultiCommand)
            return read32(this._header, 4)
        return undefined
    }

    get size(): number {
        return this._header[12];
    }

    get requiresAck(): boolean {
        return (this.frameFlags & JD_FRAME_FLAG_ACK_REQUESTED) ? true : false;
    }
    set requiresAck(ack: boolean) {
        if (ack != this.requiresAck)
            this._header[3] ^= JD_FRAME_FLAG_ACK_REQUESTED
        this._decoded = undefined;
    }

    get serviceIndex(): number {
        return this._header[13] & JD_SERVICE_INDEX_MASK;
    }
    set serviceIndex(value: number) {
        if (value == null)
            throw new Error("service_number not set")
        this._header[13] = (this._header[13] & JD_SERVICE_INDEX_INV_MASK) | value;
        this._decoded = undefined;
    }

    get service_class(): number {
        if (this.device)
            return this.device.serviceClassAt(this.serviceIndex)
        return undefined
    }

    get crc(): number {
        return read16(this._header, 0)
    }

    get serviceCommand(): number {
        return read16(this._header, 14)
    }
    set serviceCommand(cmd: number) {
        write16(this._header, 14, cmd)
        this._decoded = undefined;
    }

    get isRegisterSet() {
        return (this.serviceCommand >> 12) == (CMD_SET_REG >> 12)
    }

    get isRegisterGet() {
        return (this.serviceCommand >> 12) == (CMD_GET_REG >> 12)
    }

    get registerIdentifier() {
        if (!this.isRegisterGet || !this.isRegisterSet)
            return undefined;
        return this.serviceCommand & CMD_REG_MASK;
    }

    get isEvent() {
        return this.serviceCommand === CMD_EVENT;
    }

    get isCRCAck() {
        return this.serviceIndex === JD_SERVICE_INDEX_CRC_ACK;
    }

    get isPipe() {
        return this.serviceIndex === JD_SERVICE_INDEX_PIPE;
    }

    get pipePort() {
        return this.isPipe && this.serviceCommand >> PIPE_PORT_SHIFT;
    }

    get pipeCount() {
        return this.isPipe && this.serviceCommand & PIPE_COUNTER_MASK;
    }

    get data(): Uint8Array {
        return this._data
    }

    set data(buf: Uint8Array) {
        if (buf.length > JD_SERIAL_MAX_PAYLOAD_SIZE)
            throw Error("Too big")
        this._header[12] = buf.length
        this._data = buf
        this._decoded = undefined;
    }

    jdunpack<T extends any[]>(fmt: string): T {
        return (this._data && fmt && jdunpack<T>(this._data, fmt)) || [] as T;
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

    get stringData(): string {
        return this._data && bufferToString(this._data)
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

    get isAnnounce() {
        return this.serviceIndex == JD_SERVICE_INDEX_CTRL
            && this.isReport
            && this.serviceCommand == SystemCmd.Announce;
    }

    get isRepeatedAnnounce() {
        return this.isAnnounce && this.device?.lastServiceUpdate < this.timestamp
    }

    get decoded() {
        if (!this._decoded)
            this._decoded = decodePacketData(this);
        return this._decoded;
    }

    get meta() {
        if (!this._meta)
            this._meta = {};
        return this._meta;
    }

    clone() {
        const pkt = Packet.fromBinary(this.toBuffer(), this.timestamp);
        return pkt;
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
        this._decoded = undefined;
    }

    withFrameStripped() {
        return bufferConcat(this._header.slice(12, 12 + 4), this._data)
    }

    getNumber(fmt: NumberFormat, offset: number) {
        return getNumber(this._data, fmt, offset)
    }

    get isCommand() {
        return !!(this.frameFlags & JD_FRAME_FLAG_COMMAND)
    }

    set isCommand(value: boolean) {
        if (value)
            this._header[3] |= JD_FRAME_FLAG_COMMAND
        else
            this._header[3] &= ~JD_FRAME_FLAG_COMMAND
        this._decoded = undefined;
    }

    get isReport() {
        return !this.isCommand
    }

    toString(): string {
        let msg = `${this.deviceIdentifier}/${this.serviceIndex}[${this.frameFlags}]: ${this.serviceCommand} sz=${this.size}`
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
        this.deviceIdentifier = dev.deviceId
        return this.sendCoreAsync(dev.bus)
    }

    sendCmdAsync(dev: JDDevice) {
        if (!dev)
            return Promise.resolve()
        this.deviceIdentifier = dev.deviceId
        this.isCommand = true
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

    static jdpacked<T extends any[]>(service_command: number, fmt: string, nums: T) {
        return Packet.from(service_command, jdpack<T>(fmt, nums))
    }

    // helpers
    get friendlyDeviceName(): string {
        if (this.frameFlags & JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS)
            return "*";
        return this.device?.friendlyName || this.deviceIdentifier
    }
    get friendlyServiceName(): string {
        let service_name: string;
        if (this.isCRCAck) {
            service_name = "CRC-ACK"
        } else if (this.isPipe) {
            service_name = "PIPE"
        } else {
            const serv_id = serviceName(this.multicommandClass || this.serviceClass)
            service_name = `${serv_id} (${this.serviceIndex})`
        }
        return service_name;
    }
    get friendlyCommandName(): string {
        const cmd = this.serviceCommand
        let cmdname: string;
        if (this.isCRCAck) {
            cmdname = hexNum(cmd)
        }
        else if (this.isPipe) {
            cmdname = `port:${cmd >> PIPE_PORT_SHIFT} cnt:${cmd & PIPE_COUNTER_MASK}`
            if (cmd & PIPE_METADATA_MASK)
                cmdname += " meta"
            if (cmd & PIPE_CLOSE_MASK)
                cmdname += " close"
        } else {
            cmdname = commandName(cmd, this.serviceClass)
        }
        return cmdname;
    }
    get serviceClass() {
        return this.device?.serviceClassAt(this.serviceIndex);
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
                p.requiresAck = false
            ptr += sz
        }

        return res
    }

    return []
}

export default Packet;
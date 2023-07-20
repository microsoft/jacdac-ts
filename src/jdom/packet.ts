import {
    crc,
    ALIGN,
    write16,
    bufferConcat,
    toHex,
    fromHex,
    read32,
    read16,
    write32,
    hexNum,
    bufferToString,
} from "./utils"
import {
    JD_FRAME_FLAG_COMMAND,
    JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS,
    CMD_SET_REG,
    JD_SERIAL_HEADER_SIZE,
    JD_FRAME_FLAG_ACK_REQUESTED,
    JD_SERVICE_INDEX_MASK,
    JD_SERVICE_INDEX_INV_MASK,
    JD_SERIAL_MAX_PAYLOAD_SIZE,
    JD_SERVICE_INDEX_CRC_ACK,
    JD_SERVICE_INDEX_PIPE,
    PIPE_PORT_SHIFT,
    PIPE_COUNTER_MASK,
    PIPE_METADATA_MASK,
    PIPE_CLOSE_MASK,
    CMD_GET_REG,
    JD_SERVICE_INDEX_CTRL,
    CMD_REG_MASK,
    CMD_EVENT_CODE_MASK,
    CMD_EVENT_COUNTER_MASK,
    CMD_EVENT_MASK,
    CMD_EVENT_COUNTER_POS,
    JD_SERVICE_INDEX_MAX_NORMAL,
    JD_DEVICE_IDENTIFIER_BROADCAST_HIGH_MARK,
    JD_SERVICE_INDEX_BROADCAST,
} from "./constants"
import { JDDevice } from "./device"
import { NumberFormat, getNumber } from "./buffer"
import { JDBus } from "./bus"
import {
    commandName,
    DecodedPacket,
    decodePacketData,
    serviceName,
    shortDeviceId,
} from "./pretty"
import { SRV_CONTROL, SystemCmd } from "../../jacdac-spec/dist/specconstants"
import { jdpack, jdunpack, PackedValues } from "./pack"
import { serviceSpecificationFromClassIdentifier } from "./spec"
import { throwError } from "./error"

const { warn, debug } = console

/**
 * Represent serialized Packet, or several packets.
 */
export type JDFrameBuffer = Uint8Array & {
    _jacdac_sender?: string
    _jacdac_timestamp?: number
    _jacdac_replay?: boolean
    _jacdac_meta?: any
}

export function isLargeFrame(frame: Uint8Array) {
    return frame[2] === 0xff
}

/**
 * A Jacdac packet
 * @category JDOM
 */
export class Packet {
    private _header: Uint8Array
    private _data: Uint8Array
    private _meta: Record<string, unknown> = undefined // accesory data used by clients
    timestamp: number
    device: JDDevice
    private _decoded: DecodedPacket
    readonly key: number
    // An optional tracing identity to avoid
    // resending own packets for bridges
    public sender: string
    // Replayed in a trace
    public replay?: boolean
    public isRepeatedEvent: boolean

    private static _nextKey = 1
    private constructor() {
        this.key = Packet._nextKey++
    }

    static fromBinary(data: JDFrameBuffer, timestamp?: number) {
        if (!data || data.length > 252) return undefined
        const p = new Packet()
        p._header = data.slice(0, JD_SERIAL_HEADER_SIZE)
        p._data = data.slice(
            JD_SERIAL_HEADER_SIZE,
            JD_SERIAL_HEADER_SIZE + p.size,
        )
        p.sender = data._jacdac_sender
        p.timestamp = timestamp ?? data._jacdac_timestamp
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
        // compute correct framing and CRC
        const res = bufferConcat(this._header, this._data) as JDFrameBuffer
        res[2] = this._data.length + 4
        write16(res, 0, crc(res.slice(2)))
        res._jacdac_sender = this.sender
        res._jacdac_timestamp = this.timestamp
        return res
    }

    get header() {
        return this._header.slice(0)
    }

    get deviceIdentifier() {
        return toHex(this._header.slice(4, 4 + 8))
    }
    set deviceIdentifier(id: string) {
        if (id !== this.deviceIdentifier) {
            const idb = fromHex(id)
            if (idb.length != 8) throwError("Invalid id")
            if (this.isMultiCommand) throwError("Invalid multicast")
            this._header.set(idb, 4)
            this._decoded = undefined
            this.device = undefined
        }
    }

    get frameFlags() {
        return this._header[3]
    }

    set frameFlags(v: number) {
        this._header[3] = v
    }

    get isMultiCommand() {
        return !!(this.frameFlags & JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS)
    }

    get size(): number {
        return this._header[12]
    }

    get requiresAck(): boolean {
        return this.frameFlags & JD_FRAME_FLAG_ACK_REQUESTED ? true : false
    }
    set requiresAck(ack: boolean) {
        if (ack != this.requiresAck)
            this._header[3] ^= JD_FRAME_FLAG_ACK_REQUESTED
        this._decoded = undefined
    }

    get serviceIndex(): number {
        return this._header[13] & JD_SERVICE_INDEX_MASK
    }
    set serviceIndex(value: number) {
        if (value == null) throw new Error("service_index not set")
        this._header[13] =
            (this._header[13] & JD_SERVICE_INDEX_INV_MASK) | value
        this._decoded = undefined
    }

    get serviceClass(): number {
        if (this.isMultiCommand) return read32(this._header, 4)
        if (this.serviceIndex === 0) return SRV_CONTROL
        return this.device?.serviceClassAt(this.serviceIndex)
    }

    get crc(): number {
        return read16(this._header, 0)
    }

    get serviceCommand(): number {
        return read16(this._header, 14)
    }
    set serviceCommand(cmd: number) {
        write16(this._header, 14, cmd)
        this._decoded = undefined
    }

    get isRegisterSet() {
        return (
            this.serviceIndex <= JD_SERVICE_INDEX_MAX_NORMAL &&
            this.serviceCommand >> 12 == CMD_SET_REG >> 12
        )
    }

    get isRegisterGet() {
        return (
            this.serviceIndex <= JD_SERVICE_INDEX_MAX_NORMAL &&
            this.serviceCommand >> 12 == CMD_GET_REG >> 12
        )
    }

    // TODO rename to registerCode
    get registerIdentifier() {
        if (!this.isRegisterGet && !this.isRegisterSet) return undefined
        return this.serviceCommand & CMD_REG_MASK
    }

    get isEvent() {
        return (
            this.serviceIndex <= JD_SERVICE_INDEX_MAX_NORMAL &&
            (this.serviceCommand & CMD_EVENT_MASK) !== 0
        )
    }

    get eventCode() {
        return this.isEvent
            ? this.serviceCommand & CMD_EVENT_CODE_MASK
            : undefined
    }

    get eventCounter() {
        return this.isEvent
            ? (this.serviceCommand >> CMD_EVENT_COUNTER_POS) &
                  CMD_EVENT_COUNTER_MASK
            : undefined
    }

    get isCRCAck() {
        return this.serviceIndex === JD_SERVICE_INDEX_CRC_ACK
    }

    get isPipe() {
        return this.serviceIndex === JD_SERVICE_INDEX_PIPE
    }

    get pipePort() {
        return this.isPipe && this.serviceCommand >> PIPE_PORT_SHIFT
    }

    get pipeCount() {
        return this.isPipe && this.serviceCommand & PIPE_COUNTER_MASK
    }

    get data(): Uint8Array {
        return this._data
    }

    set data(buf: Uint8Array) {
        if (buf.length > JD_SERIAL_MAX_PAYLOAD_SIZE)
            throw Error(
                `jacdac packet length too large, ${buf.length} > ${JD_SERIAL_MAX_PAYLOAD_SIZE} bytes`,
            )
        this._header[12] = buf.length
        this._data = buf
        this._decoded = undefined
    }

    jdunpack<T extends PackedValues>(fmt: string): T {
        return (this._data && fmt && jdunpack<T>(this._data, fmt)) || ([] as T)
    }

    get uintData() {
        let buf = this._data
        if (buf.length == 0) return undefined
        if (buf.length < 4) buf = bufferConcat(buf, new Uint8Array(4))
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
        return (
            this.serviceIndex == JD_SERVICE_INDEX_CTRL &&
            this.isReport &&
            this.serviceCommand == SystemCmd.Announce
        )
    }

    get isRepeatedAnnounce() {
        return (
            this.isAnnounce && this.device?.lastServiceUpdate < this.timestamp
        )
    }

    get decoded() {
        if (!this._decoded) this._decoded = decodePacketData(this)
        return this._decoded
    }

    get meta() {
        if (!this._meta) this._meta = {}
        return this._meta
    }

    clone() {
        const pkt = new Packet()
        pkt._header = this._header.slice()
        pkt._data = this._data.slice()
        pkt.timestamp = this.timestamp
        return pkt
    }

    cloneForDevice(deviceId: string, serviceIndex: number) {
        const idb = fromHex(deviceId)
        if (idb.length != 8) throwError("Invalid id")
        if (!this.isMultiCommand) throwError("Must be multi command")

        const pkt = Packet.fromBinary(this.toBuffer(), this.timestamp)
        pkt.frameFlags &= ~JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS
        pkt._header.set(idb, 4)
        pkt._decoded = undefined
        pkt.sender = undefined
        pkt.serviceIndex = serviceIndex
        return pkt
    }

    compress(stripped: Uint8Array[]) {
        if (stripped.length == 0) return
        let sz = -4
        for (const s of stripped) {
            sz += s.length
        }
        const data = new Uint8Array(sz)
        this._header.set(stripped[0], 12)
        data.set(stripped[0].slice(4), 0)
        sz = stripped[0].length - 4
        for (const s of stripped.slice(1)) {
            data.set(s, sz)
            sz += s.length
        }
        this._data = data
        this._decoded = undefined
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
        if (value) this._header[3] |= JD_FRAME_FLAG_COMMAND
        else this._header[3] &= ~JD_FRAME_FLAG_COMMAND
        this._decoded = undefined
    }

    get isReport() {
        return !this.isCommand
    }

    assignDevice(bus: JDBus) {
        if (!this.isMultiCommand && !this.device)
            this.device = bus.device(this.deviceIdentifier, false, this)
    }

    toString(): string {
        let msg = `${shortDeviceId(this.deviceIdentifier)}/${
            this.serviceIndex
        }[${this.frameFlags}]: 0x${this.serviceCommand.toString(16)} sz=${
            this.size
        }`
        if (this.size < 20) msg += ": " + toHex(this.data)
        else msg += ": " + toHex(this.data.slice(0, 20)) + "..."
        return msg
    }

    sendCoreAsync(bus: JDBus) {
        const buf = this.toBuffer()
        // Here we're sending this packet as the only one in a frame, therefore we need to compute CRC (which toBuffer() does)
        // There's no crc computation function on Packet, since it should be typically only applied to full frames.
        // The crc field reads the CRC from the frame (which is useful eg for acks).
        this._header[0] = buf[0]
        this._header[1] = buf[1]
        this._header[2] = buf[2]
        this.assignDevice(bus)
        return bus.sendPacketAsync(this)
    }

    sendReportAsync(dev: JDDevice) {
        if (!dev) return Promise.resolve()
        this.deviceIdentifier = dev.deviceId
        this.device = dev
        return this.sendCoreAsync(dev.bus)
    }

    sendCmdAsync(dev: JDDevice) {
        if (!dev) return Promise.resolve()
        this.deviceIdentifier = dev.deviceId
        this.device = dev
        this.isCommand = true
        return this.sendCoreAsync(dev.bus)
    }

    sendAsMultiCommandAsync(bus: JDBus, service_class: number) {
        this._header[3] |=
            JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS | JD_FRAME_FLAG_COMMAND
        write32(this._header, 4, service_class)
        write32(this._header, 8, JD_DEVICE_IDENTIFIER_BROADCAST_HIGH_MARK)
        this.serviceIndex = JD_SERVICE_INDEX_BROADCAST
        return this.sendCoreAsync(bus)
    }

    static fromFrame(frame: JDFrameBuffer, timestamp: number, skipCrc = false) {
        return frameToPackets(frame, timestamp, skipCrc)
    }

    static jdpacked<T extends PackedValues>(
        service_command: number,
        fmt: string,
        nums: T,
    ) {
        return Packet.from(service_command, jdpack<T>(fmt, nums))
    }

    // helpers
    get friendlyDeviceName(): string {
        if (this.isMultiCommand) return "*"
        return this.device?.friendlyName || shortDeviceId(this.deviceIdentifier)
    }
    get friendlyServiceName(): string {
        let service_name: string
        if (this.isCRCAck) {
            service_name = "CRC-ACK"
        } else if (this.isPipe) {
            service_name = "PIPE"
        } else {
            const sc = this.serviceClass
            if (sc === undefined) return `(${this.serviceIndex})`
            else {
                const serv_id = serviceName(sc)
                service_name = `${serv_id === "?" ? hexNum(sc) : serv_id} (${
                    this.serviceIndex
                })`
            }
        }
        return service_name
    }
    get friendlyCommandName(): string {
        const cmd = this.serviceCommand
        let cmdname: string
        if (this.isCRCAck) {
            cmdname = hexNum(cmd)
        } else if (this.isPipe) {
            cmdname = `port:${cmd >> PIPE_PORT_SHIFT} cnt:${
                cmd & PIPE_COUNTER_MASK
            }`
            if (cmd & PIPE_METADATA_MASK) cmdname += " meta"
            if (cmd & PIPE_CLOSE_MASK) cmdname += " close"
        } else if (this.isEvent) {
            const spec = serviceSpecificationFromClassIdentifier(
                this.serviceClass,
            )
            const code = this.eventCode
            const pkt = spec?.packets.find(
                pkt => pkt.kind === "event" && pkt.identifier === code,
            )
            cmdname = pkt?.name
        } else {
            cmdname = commandName(cmd, this.serviceClass)
        }
        return cmdname
    }
}

function frameToPackets(
    frame: JDFrameBuffer,
    timestamp: number,
    skipCrc = false,
) {
    if (timestamp === undefined) timestamp = frame._jacdac_timestamp
    const size = frame.length < 12 ? 0 : frame[2]
    if (frame.length < size + 12) {
        warn(
            `${timestamp | 0}ms: got only ${frame.length} bytes; expecting ${
                size + 12
            }`,
        )
        return []
    } else if (size < 4) {
        warn(`${timestamp | 0}ms: empty packet`)
        return []
    } else {
        // check length first - if length doesn't CRC also won't
        if (frame.length != 12 + size) {
            warn(`${timestamp | 0}ms: unexpected packet len: ${frame.length}`)
            return []
        }
        if (!skipCrc) {
            const computed = crc(frame.slice(2, size + 12))
            const actual = read16(frame, 0)
            if (actual != computed) {
                warn(
                    `${
                        timestamp | 0
                    }ms: crc mismatch; sz=${size} got:${actual}, exp:${computed}, ${toHex(
                        frame,
                    )}`,
                )
                return []
            }
        }
        const res: Packet[] = []
        for (let ptr = 12; ptr < 12 + size; ) {
            const psz = frame[ptr] + 4
            const sz = ALIGN(psz)
            if (ptr + psz > 12 + size) {
                warn(
                    `${timestamp | 0}ms: invalid frame compression, res len=${
                        res.length
                    }`,
                )
                break
            }
            const pkt = bufferConcat(
                frame.slice(0, 12),
                frame.slice(ptr, ptr + psz),
            )
            const p = Packet.fromBinary(pkt)
            p.timestamp = timestamp
            p.sender = frame._jacdac_sender
            res.push(p)
            // only set req_ack flag on first packet - otherwise we would sent multiple acks
            if (res.length > 1) p.requiresAck = false
            ptr += sz
        }

        //debug(`${timestamp | 0}ms: decoded ${res.length} packets`)
        return res
    }
}

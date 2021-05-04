namespace jacdac {
    export const JD_SERIAL_HEADER_SIZE = 16
    export const JD_SERIAL_MAX_PAYLOAD_SIZE = 236
    export const JD_SERVICE_INDEX_MASK = 0x3f
    export const JD_SERVICE_INDEX_INV_MASK = 0xc0
    export const JD_SERVICE_INDEX_CRC_ACK = 0x3f
    export const JD_SERVICE_INDEX_PIPE = 0x3e
    export const JD_SERVICE_INDEX_CTRL = 0x00

    // the COMMAND flag signifies that the device_identifier is the recipient
    // (i.e., it's a command for the peripheral); the bit clear means device_identifier is the source
    // (i.e., it's a report from peripheral or a broadcast message)
    export const JD_FRAME_FLAG_COMMAND = 0x01
    // an ACK should be issued with CRC of this package upon reception
    export const JD_FRAME_FLAG_ACK_REQUESTED = 0x02
    // the device_identifier contains target service class number
    export const JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS = 0x04

    const ACK_RETRIES = 4
    const ACK_DELAY = 40

    let ackAwaiters: AckAwaiter[]


    function error(msg: string) {
        throw msg
    }

    export class JDPacket {
        _header: Buffer;
        _data: Buffer;
        timestamp: number;

        private constructor() {
            this.timestamp = control.millis()
        }

        static fromBinary(buf: Buffer) {
            const p = new JDPacket()
            p._header = buf.slice(0, JD_SERIAL_HEADER_SIZE)
            p._data = buf.slice(JD_SERIAL_HEADER_SIZE, p._header[12])
            return p
        }

        static from(serviceCommand: number, data: Buffer) {
            const p = new JDPacket()
            p._header = Buffer.create(JD_SERIAL_HEADER_SIZE)
            p.data = data
            p.serviceCommand = serviceCommand
            return p
        }

        static onlyHeader(serviceCommand: number) {
            return JDPacket.from(serviceCommand, Buffer.create(0))
        }

        static jdpacked(serviceCommand: number, fmt: string, nums: any[]) {
            return JDPacket.from(serviceCommand, jdpack(fmt, nums))
        }

        static segmentData(data: Buffer) {
            if (data.length <= JD_SERIAL_MAX_PAYLOAD_SIZE)
                return [data]
            const res: Buffer[] = []
            for (let i = 0; i < data.length; i += JD_SERIAL_MAX_PAYLOAD_SIZE)
                res.push(data.slice(i, JD_SERIAL_MAX_PAYLOAD_SIZE))
            return res
        }

        get deviceIdentifier() {
            // 8 is length!
            return this._header.slice(4, 8).toHex()
        }
        set deviceIdentifier(id: string) {
            const idb = Buffer.fromHex(id)
            if (idb.length != 8)
                error("Invalid id")
            this._header.write(4, idb)
        }

        get packetFlags() { return this._header[3] }

        get multicommandClass() {
            if (this.packetFlags & JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS)
                return this._header.getNumber(NumberFormat.UInt32LE, 4)
            return undefined
        }

        get size(): number {
            return this._header[12];
        }

        get requiresAck(): boolean {
            return (this.packetFlags & JD_FRAME_FLAG_ACK_REQUESTED) ? true : false;
        }
        set requiresAck(ack: boolean) {
            if (ack != this.requiresAck)
                this._header[3] ^= JD_FRAME_FLAG_ACK_REQUESTED
        }

        get serviceIndex(): number {
            return this._header[13] & JD_SERVICE_INDEX_MASK;
        }
        set serviceIndex(serviceIdx: number) {
            if (serviceIdx == null)
                throw "serviceIndex not set"
            this._header[13] = (this._header[13] & JD_SERVICE_INDEX_INV_MASK) | serviceIdx;
        }

        get crc(): number {
            return this._header.getNumber(NumberFormat.UInt16LE, 0)
        }

        get serviceCommand(): number {
            return this._header.getNumber(NumberFormat.UInt16LE, 14)
        }
        set serviceCommand(cmd: number) {
            this._header.setNumber(NumberFormat.UInt16LE, 14, cmd)
        }

        get isEvent() {
            return this.isReport && (this.serviceCommand & CMD_EVENT_MASK) != 0
        }

        get eventCode() {
            return this.isEvent ? this.serviceCommand & CMD_EVENT_CODE_MASK : undefined
        }

        get eventCounter() {
            return this.isEvent ? (this.serviceCommand >> CMD_EVENT_COUNTER_POS) & CMD_EVENT_COUNTER_MASK : undefined
        }

        get isRegSet() {
            return (this.serviceCommand >> 12) == (CMD_SET_REG >> 12)
        }

        get isRegGet() {
            return (this.serviceCommand >> 12) == (CMD_GET_REG >> 12)
        }

        get regCode() {
            return this.serviceCommand & CMD_REG_MASK
        }

        get data(): Buffer {
            return this._data
        }

        set data(buf: Buffer) {
            if (buf.length > JD_SERIAL_MAX_PAYLOAD_SIZE)
                throw "Too big"
            this._header[12] = buf.length
            this._data = buf
        }

        get intData() {
            return intOfBuffer(this._data)
        }

        get uintData() {
            return uintOfBuffer(this._data)
        }

        get stringData() {
            return this._data && this._data.toString();
        }

        jdunpack<T extends any[]>(fmt: string): T {
            const p = this._data && fmt && jdunpack<T>(this._data, fmt);
            return (p || []) as T;
        }

        compress(stripped: Buffer[]) {
            if (stripped.length == 0)
                return
            let sz = -4
            for (let s of stripped) {
                sz += s.length
            }
            const data = Buffer.create(sz)
            this._header.write(12, stripped[0])
            data.write(0, stripped[0].slice(4))
            sz = stripped[0].length - 4
            for (let s of stripped.slice(1)) {
                data.write(sz, s)
                sz += s.length
            }
            this.data = data
        }

        withFrameStripped() {
            return this._header.slice(12, 4).concat(this._data)
        }

        getNumber(fmt: NumberFormat, offset: number) {
            return this._data.getNumber(fmt, offset)
        }

        jdpack(fmt: string, nums: any[]) {
            this.data = jdpack(fmt, nums)
        }

        get isCommand() {
            return !!(this.packetFlags & JD_FRAME_FLAG_COMMAND)
        }

        get isReport() {
            return !(this.packetFlags & JD_FRAME_FLAG_COMMAND)
        }

        toString(): string {
            let msg = `${jacdac.shortDeviceId(this.deviceIdentifier)}/${this.serviceIndex}[${this.packetFlags}]: ${this.serviceCommand} sz=${this.size}`
            if (this.size < 20) msg += ": " + this.data.toHex()
            else msg += ": " + this.data.slice(0, 20).toHex() + "..."
            return msg
        }

        _sendCore() {
            if (this._data.length != this._header[12])
                throw "jdsize mismatch"
            jacdac.__physSendPacket(this._header, this._data)
        }

        _sendReport(dev: Device) {
            if (!dev)
                return
            this.deviceIdentifier = dev.deviceId
            this._sendCore()
        }

        _sendCmd(dev: Device) {
            if (!dev)
                return
            this._sendCmdId(dev.deviceId)
        }

        _sendCmdId(devId: string) {
            if (!devId)
                return
            this.deviceIdentifier = devId
            this._header[3] |= JD_FRAME_FLAG_COMMAND
            this._sendCore()
        }

        sendAsMultiCommand(serviceClass: number) {
            this._header[3] |= JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS | JD_FRAME_FLAG_COMMAND
            this._header.setNumber(NumberFormat.UInt32LE, 4, serviceClass)
            this._header.setNumber(NumberFormat.UInt32LE, 8, 0)
            this._sendCore()
        }

        // returns true when sent and received
        _sendWithAck(devId: string) {
            if (!devId)
                return false
            this.requiresAck = true
            this._sendCmdId(devId)

            if (!ackAwaiters) {
                ackAwaiters = []
                control.runInParallel(() => {
                    while (1) {
                        pause(Math.randomRange(20, 50))
                        checkAckAwaiters()
                    }
                })
            }

            const aw = new AckAwaiter(this, devId)
            ackAwaiters.push(aw)
            while (aw.nextRetry > 0)
                control.waitForEvent(DAL.DEVICE_ID_NOTIFY, aw.eventId)
            return aw.nextRetry == 0
        }
    }

    class AckAwaiter {
        nextRetry: number
        numTries = 1
        readonly crc: number
        readonly eventId: number
        constructor(
            public readonly pkt: JDPacket,
            public readonly srcId: string
        ) {
            this.crc = pkt.crc
            this.nextRetry = control.millis() + ACK_DELAY
            this.eventId = control.allocateNotifyEvent()
        }
    }

    function checkAckAwaiters() {
        const now = control.millis()
        const toRetry = ackAwaiters.filter(a => now > a.nextRetry)
        if (!toRetry.length)
            return
        for (let a of toRetry) {
            if (a.nextRetry == 0)
                continue // already got ack
            if (a.numTries >= ACK_RETRIES) {
                a.nextRetry = -1
                control.raiseEvent(DAL.DEVICE_ID_NOTIFY, a.eventId)
            } else {
                a.numTries++
                a.nextRetry = now + a.numTries * ACK_DELAY
                a.pkt._sendCore()
            }
        }
        ackAwaiters = ackAwaiters.filter(a => a.nextRetry > 0)
    }

    export function _gotAck(pkt: JDPacket) {
        if (!ackAwaiters)
            return
        let numNotify = 0
        const srcId = pkt.deviceIdentifier
        const crc = pkt.serviceCommand
        for (let a of ackAwaiters) {
            if (a.crc == crc && a.srcId == srcId) {
                a.nextRetry = 0
                control.raiseEvent(DAL.DEVICE_ID_NOTIFY, a.eventId)
                numNotify++
            }
        }
        if (numNotify)
            ackAwaiters = ackAwaiters.filter(a => a.nextRetry !== 0)
    }

    export function intOfBuffer(data: Buffer): number {
        let fmt: NumberFormat
        switch (data.length) {
            case 0:
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
        return data.getNumber(fmt, 0)
    }

    export function uintOfBuffer(data: Buffer): number {
        let fmt: NumberFormat
        switch (data.length) {
            case 0:
            case 1:
                fmt = NumberFormat.UInt8LE
                break
            case 2:
            case 3:
                fmt = NumberFormat.UInt16LE
                break
            default:
                fmt = NumberFormat.UInt32LE
                break
        }
        return data.getNumber(fmt, 0)
    }
}

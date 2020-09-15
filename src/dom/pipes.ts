import { JDDevice } from "./device"
import { PIPE_PORT_SHIFT, PIPE_COUNTER_MASK, PIPE_CLOSE_MASK, JD_SERVICE_NUMBER_PIPE, PIPE_METADATA_MASK, PACKET_RECEIVE, DATA, CLOSE } from "./constants"
import { Packet } from "./packet"
import { JDBus } from "./bus"
import { randomUInt, signal, withTimeout, fromHex } from "./utils"
import { JDEventSource } from "./eventsource"
import { pack } from "./struct"

export class OutPipe {
    private count = 0

    constructor(private device: JDDevice, private port: number) {
    }

    get isOpen() {
        return this.device != null
    }

    send(buf: Uint8Array) {
        return this.sendData(buf, 0)
    }

    sendMeta(buf: Uint8Array) {
        return this.sendData(buf, PIPE_METADATA_MASK)
    }

    private async sendData(buf: Uint8Array, flags: number) {
        if (!this.device)
            return
        const cmd = (this.port << PIPE_PORT_SHIFT) | flags | (this.count & PIPE_COUNTER_MASK)
        const pkt = Packet.from(cmd, buf)
        pkt.service_number = JD_SERVICE_NUMBER_PIPE
        await this.device.sendPktWithAck(pkt)
            .then(() => { }, err => {
                this.free()
            })
        this.count++
    }

    private free() {
        this.device = null
        this.port = null
    }

    async close() {
        await this.sendData(new Uint8Array(0), PIPE_CLOSE_MASK)
        this.free()
    }
}


export class InPipe extends JDEventSource {
    private _port: number
    private _count = 0

    constructor(private bus: JDBus) {
        super()

        this._handlePacket = this._handlePacket.bind(this)

        while (true) {
            this._port = 1 + randomUInt(511)
            const info = this.bus.selfDevice.port(this._port)
            if (!info.localPipe && !info.pipeType) {
                info.localPipe = this
                break
            }
        }

        this.bus.enableAnnounce()
        this.bus.selfDevice.on(PACKET_RECEIVE, this._handlePacket)
    }

    get isOpen() {
        return this._port != null
    }

    openCommand(cmd: number) {
        const b = pack("IIHH", [0, 0, this._port, 0])
        b.set(fromHex(this.bus.selfDeviceId), 0)
        return Packet.from(cmd, b)
    }

    async readAll(timeout = 500) {
        const output: Packet[] = []
        const meta: Packet[] = []
        const done = signal()

        this.on(DATA, (pkt: Packet) => {
            if (pkt.service_command & PIPE_METADATA_MASK)
                meta.push(pkt)
            else
                output.push(pkt)
        })

        this.on(CLOSE, done.signal)

        await withTimeout(timeout, done.signalled)

        return { meta, output }
    }

    private _handlePacket(pkt: Packet) {
        if (pkt.service_number !== JD_SERVICE_NUMBER_PIPE)
            return
        if (pkt.service_command >> PIPE_PORT_SHIFT !== this._port)
            return
        if ((pkt.service_command & PIPE_COUNTER_MASK) == (this._count & PIPE_COUNTER_MASK)) {
            this._count++
            this.emit(DATA, pkt)
            if (pkt.service_command & PIPE_CLOSE_MASK) {
                this.close()
            }
        }
    }

    close() {
        if (this._port == null)
            return
        this.emit(CLOSE)
        this._port = null
        this.bus.selfDevice.port(this._port).localPipe = undefined
        this.bus.selfDevice.off(PACKET_RECEIVE, this._handlePacket)
    }
}

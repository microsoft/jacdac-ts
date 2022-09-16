import { JDDevice } from "./device"
import {
    PIPE_PORT_SHIFT,
    PIPE_COUNTER_MASK,
    PIPE_CLOSE_MASK,
    JD_SERVICE_INDEX_PIPE,
    PIPE_METADATA_MASK,
    PACKET_RECEIVE,
    DATA,
    CLOSE,
} from "./constants"
import { Packet } from "./packet"
import { JDBus } from "./bus"
import { signal, fromHex, throwError, toHex, assert } from "./utils"
import { JDClient } from "./client"
import { jdpack, jdunpack } from "./pack"
import { randomUInt } from "./random"
import { JDService } from "./service"

const { warn } = console

export class OutPipe {
    private _count = 0

    constructor(
        private device: JDDevice,
        private port: number,
        readonly hosted?: boolean
    ) {}

    static from(bus: JDBus, pkt: Packet, hosted?: boolean) {
        const [idbuf, port] = pkt.jdunpack<[Buffer, number]>("b[8] u16")
        const id = toHex(idbuf)
        const dev = bus.device(id, false, pkt)
        return new OutPipe(dev, port, hosted)
    }

    get count() {
        return this._count
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

    async respondForEach<T>(
        items: ArrayLike<T>,
        converter: (item: T) => Uint8Array
    ) {
        const n = items.length
        for (let i = 0; i < n; ++i) {
            const item = items[i]
            const data = converter(item)
            await this.send(data)
        }
        await this.close()
    }

    private async sendData(buf: Uint8Array, flags: number) {
        if (!this.device) {
            warn("sending data over closed pipe")
            return
        }
        const cmd =
            (this.port << PIPE_PORT_SHIFT) |
            flags |
            (this._count & PIPE_COUNTER_MASK)
        const pkt = Packet.from(cmd, buf)
        pkt.serviceIndex = JD_SERVICE_INDEX_PIPE
        try {
            // this needs await - we don't want to send further pipe packets before the current
            // one is ACKed
            await this.device.sendPktWithAck(pkt)
        } catch {
            this.free()
        }
        this._count++
    }

    private free() {
        this.device = null
        this.port = null
    }

    async close() {
        await this.sendData(new Uint8Array(0), PIPE_CLOSE_MASK)
        this.free()
    }

    async sendBytes(data: Uint8Array) {
        const chunkSize = 224 // has to be divisible by 8
        for (let i = 0; i < data.length; i += chunkSize) {
            await this.send(data.slice(i, i + chunkSize))
        }
    }

    static async sendBytes(
        service: JDService,
        cmd: number,
        data: Uint8Array,
        onProgress?: (p: number) => void
    ): Promise<void> {
        const { device } = service

        onProgress?.(0)
        const resp = await service.sendCmdAwaitResponseAsync(
            Packet.jdpacked(cmd, "u32", [data.length]),
            3000
        )
        onProgress?.(0.05)
        const [pipePort] = jdunpack<[number]>(resp.data, "u16")
        if (!pipePort) throw new Error("wrong port " + pipePort)

        const pipe = new OutPipe(device, pipePort)
        const chunkSize = 224 // has to be divisible by 8
        for (let i = 0; i < data.length; i += chunkSize) {
            await pipe.send(data.slice(i, i + chunkSize))
            onProgress?.(0.05 + (i / data.length) * 0.9)
        }
        try {
            await pipe.close()
        } catch (e) {
            // the device may restart before we manage to close
            console.debug(e)
        }
        onProgress?.(1)
    }
}

export class InPipe extends JDClient {
    private _port: number
    private _count = 0

    constructor(protected readonly bus: JDBus) {
        super()

        this._handlePacket = this._handlePacket.bind(this)
        this.allocPort()
        this.mount(
            this.bus.selfDevice.subscribe(PACKET_RECEIVE, this._handlePacket)
        )
    }

    get port() {
        return this._port
    }

    get count() {
        return this._count
    }

    get isOpen() {
        return this._port != null
    }

    private allocPort() {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            this._port = 1 + randomUInt(511)
            const info = this.bus.selfDevice.port(this._port)
            if (!info.localPipe && !info.pipeType) {
                info.localPipe = this
                break
            }
        }
    }

    openCommand(cmd: number) {
        if (!this.isOpen) throwError("trying to access a closed pipe")
        const b = jdpack<[Uint8Array, number, number]>("b[8] u16 u16", [
            fromHex(this.bus.selfDeviceId),
            this._port,
            0,
        ])
        return Packet.from(cmd, b)
    }

    private _handlePacket(pkt: Packet) {
        if (!pkt.isPipe) return
        if (pkt.pipePort !== this._port) return
        if (
            (pkt.serviceCommand & PIPE_COUNTER_MASK) ==
            (this._count & PIPE_COUNTER_MASK)
        ) {
            this._count++
            this.emit(DATA, pkt)
            if (pkt.serviceCommand & PIPE_CLOSE_MASK) {
                this.close()
            }
        }
    }

    close() {
        if (this._port == null) return
        this.emit(CLOSE)
        this._port = null
        this.bus.selfDevice.port(this._port).localPipe = undefined
        this.unmount()
    }
}

export class InPipeReader extends InPipe {
    private done = signal()
    private meta: Packet[] = []
    private output: Packet[] = []

    constructor(bus: JDBus) {
        super(bus)
        this.mount(
            this.subscribe(DATA, (pkt: Packet) => {
                if (pkt.serviceCommand & PIPE_METADATA_MASK) this.meta.push(pkt)
                else this.output.push(pkt)
            })
        )
        this.mount(this.subscribe(CLOSE, this.done.signal))
    }

    async readData(timeout = 500): Promise<Uint8Array[]> {
        const r = await this.readAll(timeout)
        return r.output.map(p => p.data).filter(b => !!b?.length)
    }

    async readBytes(timeout = 500): Promise<Uint8Array> {
        const data = await this.readData(timeout)
        const n = data.reduce((n, b) => n + b.length, 0)
        const res = new Uint8Array(n)
        let i = 0
        data.forEach(d => {
            res.set(d, i)
            i += d.length
        })
        assert(i === n)
        return res
    }

    async readAll(timeout = 500) {
        const res = await this.bus.withTimeout(timeout, this.done.signalled)
        if (!res) throw new Error("Timeout reading pipe: " + timeout + "ms")
        return {
            meta: this.meta,
            output: this.output,
        }
    }
}

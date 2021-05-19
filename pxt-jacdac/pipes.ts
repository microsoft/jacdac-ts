namespace jacdac {
    const PORT_SHIFT = 7
    const COUNTER_MASK = 0x001f
    const CLOSE_MASK = 0x0020
    const METADATA_MASK = 0x0040

    let pipes: InPipe[]
    function handlePipeData(pkt: JDPacket) {
        if (pkt.serviceIndex != JD_SERVICE_INDEX_PIPE || pkt.deviceIdentifier != bus.selfDevice.deviceId)
            return
        const port = pkt.serviceCommand >> PORT_SHIFT
        const s = pipes.find(s => s.port == port)
        if (s) s._handle(pkt)
    }

    export class InPipe {
        port: number
        private nextCnt = 0
        private closed = false
        private inQ: Buffer[]
        private eventId: number

        constructor() {
            this.eventId = control.allocateNotifyEvent()
            this.inQ = []
            if (!pipes) {
                pipes = []
                jacdac.bus.on(PACKET_PROCESS, handlePipeData)
            }
            while (true) {
                this.port = Math.randomRange(1, 511)
                if (pipes.every(s => s.port != this.port))
                    break
            }
            pipes.push(this)
        }

        openCommand(cmd: number) {
            const b = jdpack<[Buffer, number, number]>("b[8] u16 u16",
                [Buffer.fromHex(bus.selfDevice.deviceId), this.port, 0])
            return JDPacket.from(cmd, b)
        }

        bytesAvailable() {
            let sum = 0
            for (const b of this.inQ)
                sum += b.length
            return sum
        }

        read() {
            while (true) {
                if (this.inQ.length)
                    return this.inQ.shift()

                if (this.closed)
                    return null

                control.waitForEvent(DAL.DEVICE_ID_NOTIFY, this.eventId);
            }
        }

        private _close() {
            this.closed = true
            pipes.removeElement(this)
        }

        close() {
            this._close()
            this.inQ = []
        }

        meta(buf: Buffer) { }

        _handle(pkt: JDPacket) {
            let cmd = pkt.serviceCommand
            if ((cmd & COUNTER_MASK) != (this.nextCnt & COUNTER_MASK))
                return
            this.nextCnt++
            if (cmd & CLOSE_MASK)
                this._close()
            if (cmd & METADATA_MASK) {
                this.meta(pkt.data)
            } else {
                this.inQ.push(pkt.data)
                control.raiseEvent(DAL.DEVICE_ID_NOTIFY_ONE, this.eventId);
            }
        }

        readList<T>(f: (b: Buffer) => T) {
            const r: T[] = []
            while (true) {
                const buf = this.read()
                if (!buf) return r
                if (buf.length)
                    r.push(f(buf))
            }
        }
    }

    export class OutPipe {
        private nextCnt = 0

        constructor(public readonly deviceId: string, public port: number) {
        }

        static from(pkt: JDPacket) {
            const [idbuf, port] = jdunpack<[Buffer, number]>(pkt.data, "b[8] u16");
            const id = idbuf.toHex();
            return new OutPipe(id, port)
        }

        static respondForEach<T>(pkt: JDPacket, inp: T[], f: (v: T) => Buffer) {
            control.runInParallel(() => {
                try {
                    const outp = OutPipe.from(pkt)
                    for (const e of inp)
                        outp.write(f(e))
                    outp.close()
                } catch (e) {
                    console.error("respondForEach " + e)
                }
            })
        }

        get isOpen() {
            return !!this.port
        }

        private writeEx(buf: Buffer, flags: number) {
            if (!this.port) return
            const pkt = JDPacket.from((this.nextCnt & COUNTER_MASK) | (this.port << PORT_SHIFT) | flags, buf)
            this.nextCnt++
            if (flags & CLOSE_MASK)
                this.port = null
            pkt.serviceIndex = JD_SERVICE_INDEX_PIPE
            if (!pkt._sendWithAck(this.deviceId)) {
                this.port = null
                throw "out pipe error: no ACK"
            }
        }

        write(buf: Buffer) {
            this.writeEx(buf, 0)
        }

        writeAndClose(buf: Buffer) {
            this.writeEx(buf, CLOSE_MASK)
        }

        close() {
            this.writeAndClose(Buffer.create(0))
        }

        writeMeta(buf: Buffer) {
            this.writeEx(buf, METADATA_MASK)
        }
    }
}
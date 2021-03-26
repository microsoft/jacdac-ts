namespace jacdac {
    const CMD_OPEN = 0x80

    export class Socket {
        private outp: OutPipe
        private inp: InPipe
        isConnected = false

        close() {
            this.outp.close()
        }
        write(buf: Buffer) {
            if (this.isConnected)
                this.outp.write(buf)
        }
        read(): Buffer {
            if (this.isConnected)
                return this.inp.read()
            else
                return null
        }
        bytesAvailable(): number {
            return this.inp.bytesAvailable()
        }

        connectSSL(hostname: string, port: number) {
            if (this.isConnected)
                throw "already connected"
            this.outp.writeMeta(jdpack("u32 u16 z", [1, port, hostname]));
            const buf = this.inp.read()
            if (buf && buf.length == 0) {
                this.isConnected = true
            } else {
                throw "can't connect"
            }
        }

        constructor(private parent: TcpClient) {
            this.inp = new InPipe()
            // TODO handle races
            this.parent.sendCommandWithAck(this.inp.openCommand(CMD_OPEN))
            pauseUntil(() => this.parent._retPort != null)
            const port = this.parent._retPort
            this.parent._retPort = null
            this.outp = new OutPipe(this.parent.device.deviceId, port)
        }
    }

    export class TcpClient extends Client {
        _retPort: number = null

        constructor(role: string) {
            super(jacdac.SRV_TCP, role);
        }

        handlePacket(pkt: JDPacket) {
            if (pkt.serviceCommand == CMD_OPEN) {
                this._retPort = pkt.intData
            }
        }

        mkSocket() {
            const s = new Socket(this)
            return s
        }
    }
}
import { JDDevice } from "./device"
import { PIPE_PORT_SHIFT, PIPE_COUNTER_MASK, PIPE_CLOSE_MASK, JD_SERVICE_NUMBER_PIPE, PIPE_METADATA_MASK } from "./constants"
import { Packet } from "./packet"

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

// InPipe is a little more involved, as it requires coming up with
// a device ID for the browser "client"


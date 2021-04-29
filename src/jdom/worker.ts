import Packet from "./packet"
import { JDTransport } from "./transport"

export class WorkerTransport extends JDTransport {
    private worker: Worker

    constructor(type: string) {
        super(type)
        this.worker = new Worker("jacdac-serviceworker.js", {})
    }

    protected async transportConnectAsync(background: boolean) {
        if (!background) {
            // request device first
            
        }
        this.worker.postMessage({ type: "connect" })
    }

    protected async transportSendPacketAsync(p: Packet) {
        const payload = p.toBuffer()
        this.worker.postMessage({
            type: "frame",
            payload,
        })
    }

    protected async transportDisconnectAsync() {
        this.worker.postMessage({ type: "disconnect" })
    }
}

import { JDBridge } from "../bridge"
import { inIFrame } from "../iframeclient"

class IFrameBridge extends JDBridge {
    constructor(readonly targetOrigin: string) {
        super("iframe")
        this.handleMessage = this.handleMessage.bind(this)
        window.addEventListener("message", this.handleMessage, false)
        this.mount(() =>
            window.removeEventListener("message", this.handleMessage)
        )
        //console.debug(`jacdac: iframe bridge created`)
    }

    private handleMessage(msg: MessageEvent) {
        const { data } = msg
        if (data.channel === "jacdac" && data.type === "messagepacket") {
            const payload: Uint8Array = data.data
            this.receivePacket(payload)
        }
    }

    protected sendPacket(data: Uint8Array, sender: string): void {
        const msg = {
            type: "messagepacket",
            channel: "jacdac",
            data,
            sender,
            broadcast: true,
        }
        window.parent.postMessage(msg, this.targetOrigin)
    }
}

export function createIFrameBridge(parentOrigin = "*"): JDBridge {
    return inIFrame() && new IFrameBridge(parentOrigin)
}

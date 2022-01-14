import { JDBridge } from "../bridge"
import { inIFrame } from "../iframeclient"

class IFrameBridge extends JDBridge {
    constructor(readonly targetOrigin: string) {
        super()
        this.handleMessage = this.handleMessage.bind(this)
        window.addEventListener("message", this.handleMessage, false)
        this.mount(() =>
            window.removeEventListener("message", this.handleMessage)
        )
        console.debug(`jacdac: iframe bridge created`)
    }

    private handleMessage(msg: MessageEvent) {
        const { data } = msg
        if (data.channel === "jacdac" && data.type === "messagepacket") {
            const payload: Uint8Array = data.data
            this.receivePacket(payload)
        }
    }

    protected sendPacket(data: Uint8Array): void {
        const msg = {
            type: "messagepacket",
            channel: "jacdac",
            data,
            sender: this.bridgeId,
            broadcast: true,
        }
        window.parent.postMessage(msg, this.targetOrigin)
    }
}

export function createIFrameBridge(parentOrigin = "*"): JDBridge {
    return inIFrame() && new IFrameBridge(parentOrigin)
}

export function startDevTools() {
    if (
        typeof window !== "undefined" &&
        !/^https:\/\/microsoft.github.io\/jacdac-docs\//.test(
            window.location.href
        )
    )
        window.location.href = `https://microsoft.github.io/jacdac-docs/clients/javascript/devtools.html#${window.location.href}`
}

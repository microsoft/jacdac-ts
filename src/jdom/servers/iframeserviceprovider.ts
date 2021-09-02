import Packet from "../packet"
import JDServiceProvider from "./serviceprovider"

export interface PacketMessage {
    channel: "jacdac"
    type: "messagepacket"
    broadcast: true
    data: Uint8Array
    sender?: string
}

export class IFrameServiceProvider extends JDServiceProvider {
    private _iframe: HTMLIFrameElement
    private _packetSent: number
    private readonly title: string
    private readonly urlFormatter: (url: string, id?: string) => string

    constructor(
        private readonly urlRoot: string,
        options?: {
            deviceId?: string
            title?: string
            urlFormatter?: (url: string, id?: string) => string
        }
    ) {
        super(options?.deviceId)
        this.title =
            options?.title ||
            `Jacdac device simulator hosted at ${this.urlRoot}`
        this.urlFormatter =
            options?.urlFormatter || ((url, id) => `${url}#${id}`)
    }

    get url() {
        return this.urlFormatter(this.urlRoot, this.deviceId)
    }

    get iframe(): HTMLElement {
        return this._iframe
    }

    protected start(): void {
        super.start()
        this._packetSent = 0
        if (typeof Window === "undefined") return // no DOM

        // position iframe to the bottom right of the window
        this._iframe = document.createElement("iframe")
        this._iframe.title = this.title
        this._iframe.style.width = "1px"
        this._iframe.style.height = "1px"
        this._iframe.style.position = "absolute"
        this._iframe.style.right = "1px"
        this._iframe.style.bottom = "1px"

        this._iframe.allow = "usb;serial"
        this._iframe.src = this.url

        // TODO receive messages
    }

    protected stop(): void {
        super.stop()
        // unload iframe if needed
        if (this._iframe?.parentElement) {
            this._iframe.parentElement.removeChild(this._iframe)
        }
        this._iframe = undefined
    }

    protected handlePacket(pkt: Packet): void {
        this._packetSent++
        const msg: PacketMessage = {
            type: "messagepacket",
            channel: "jacdac",
            broadcast: true,
            data: pkt.toBuffer(),
            sender: pkt.sender,
        }
        this._iframe?.contentWindow?.postMessage(msg, origin)
    }

    get packetSent() {
        return this._packetSent
    }
}
export default IFrameServiceProvider

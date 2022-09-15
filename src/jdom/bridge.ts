import { JDBus } from "./bus"
import { JDClient } from "./client"
import { CHANGE, FRAME_PROCESS, FRAME_SEND } from "./constants"
import { JDFrameBuffer } from "./packet"
import { randomDeviceId } from "./random"

/**
 * A client that bridges received and sent packets to a parent iframe.
 * @category JDOM
 */
export abstract class JDBridge extends JDClient {
    private _bus: JDBus
    readonly bridgeId: string
    packetSent = 0
    packetProcessed = 0

    constructor(name: string, public readonly infrastructure: boolean = false) {
        super()
        this.bridgeId = `bridge-${name}-` + randomDeviceId()
        this.handleSendFrame = this.handleSendFrame.bind(this)
    }

    get bus() {
        return this._bus
    }

    set bus(newBus: JDBus) {
        if (newBus !== this._bus) {
            if (this._bus) this.unmount()
            this._bus = newBus
            if (this._bus) {
                this.mount(
                    this._bus.subscribe(FRAME_PROCESS, this.handleSendFrame)
                )
                this.mount(
                    this._bus.subscribe(FRAME_SEND, this.handleSendFrame)
                )
                this.mount(this._bus.addBridge(this))
            }
            this.emit(CHANGE)
        }
    }

    /**
     * Receives frame (or packet) data payload and injects it into the bus
     * @param data
     * @returns
     */
    protected receiveFrame(data: JDFrameBuffer) {
        if (!this._bus) return // disconnected
        this.receiveFrameOrPacket(data)
    }

    /**
     * Decodes and distributes a payload
     * @param data
     */
    receiveFrameOrPacket(data: JDFrameBuffer, sender?: string) {
        this.packetProcessed++
        // send to native bus
        this.bus.sendFrameAsync(data)
        // tracing the source of packets to avoid self-resending; send to JS bus
        this.bus.processFrame(data, sender || this.bridgeId)
    }

    private handleSendFrame(frame: JDFrameBuffer) {
        if (!this._bus || frame._jacdac_sender === this.bridgeId) return
        this.packetSent++
        this.sendPacket(frame, frame._jacdac_sender)
    }

    /**
     * Sends packet data over the bridge
     * @param pkt
     */
    protected abstract sendPacket(data: Uint8Array, sender: string): void
}

class ProxyBridge extends JDBridge {
    constructor(
        readonly _sendPacket: (pkt: Uint8Array, sender: string) => void
    ) {
        super("proxy", true)
    }
    protected sendPacket(data: Uint8Array, sender: string): void {
        this._sendPacket(data, sender)
    }
}

export function createProxyBridge(
    sendPacket: (pkt: Uint8Array, sender: string) => void
) {
    return new ProxyBridge(sendPacket)
}

import { WEBSOCKET_TRANSPORT } from "../constants"
import JDError from "../error"
import Packet from "../packet"
import Transport, { TransportOptions } from "./transport"

/**
 * Transport creation options for web sockets
 * @category Transport
 */
export interface WebSocketTransportOptions extends TransportOptions {
    protocols: string | string[]
}

/**
 * Indicates if web sockets are supported by this platform
 * @returns
 */
export function isWebSocketTransportSupported() {
    return typeof WebSocket !== "undefined"
}

class WebSocketTransport extends Transport {
    private readonly protocols: string | string[]
    private ws: WebSocket

    constructor(readonly url: string, options?: WebSocketTransportOptions) {
        super(WEBSOCKET_TRANSPORT, options)
        this.protocols = options?.protocols
    }

    protected transportConnectAsync(background?: boolean): Promise<void> {
        return new Promise(resolve => {
            this.ws = new WebSocket(this.url, this.protocols)
            this.ws.binaryType = "arraybuffer"
            this.ws.onopen = () => resolve()
            this.ws.onerror = () => this.disconnect(background)
            this.ws.onclose = () => this.disconnect(background)
            this.ws.onmessage = (ev: MessageEvent<ArrayBuffer>) => {
                const { data } = ev
                const buffer = new Uint8Array(data)
                this.handlePacket(buffer)
            }
        })
    }

    protected transportSendPacketAsync(p: Packet): Promise<void> {
        if (this.ws?.readyState !== this.ws.OPEN)
            throw new JDError(
                "Trying to send message on closed transport",
                "TransportClosed"
            )
        const data = p.toBuffer()
        this.ws.send(data)
        return Promise.resolve()
    }

    protected transportDisconnectAsync(background?: boolean): Promise<void> {
        try {
            this.ws?.close()
            this.ws = undefined
        } catch (e) {
            if (!background) throw e
        }
        return Promise.resolve()
    }

    toString() {
        return `websocket transport (state: ${this.ws?.readyState})`
    }
}

/**
 * Creates a transport over a web socket connection
 * @category transport
 */
export function createWebSocketTransport(
    url: string,
    options?: WebSocketTransportOptions
) {
    return new WebSocketTransport(url, options)
}

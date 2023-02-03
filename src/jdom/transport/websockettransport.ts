import {
    FRAME_SEND_DISCONNECT,
    SIDE_DATA,
    WEBSOCKET_TRANSPORT,
} from "../constants"
import { JSONTryParse } from "../utils"
import { Transport, TransportOptions } from "./transport"

const RECONNECT_TIMEOUT = 5000

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

export class WebSocketTransport extends Transport {
    private readonly protocols: string | string[]
    private ws: WebSocket
    private lastConnectTimestamp = 0

    constructor(readonly url: string, options?: WebSocketTransportOptions) {
        super(WEBSOCKET_TRANSPORT, options)
        this.protocols = options?.protocols
        this.on(FRAME_SEND_DISCONNECT, this.handleSendDisconnect.bind(this))
    }

    description() {
        return this.url
    }

    private handleSendDisconnect() {
        const now = this.bus.timestamp
        if (now - this.lastConnectTimestamp > RECONNECT_TIMEOUT) {
            this.lastConnectTimestamp = now
            this.connect(true)
        }
    }

    protected transportConnectAsync(background?: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.ws = new WebSocket(this.url, this.protocols)
            if (this.ws.binaryType != "arraybuffer")
                this.ws.binaryType = "arraybuffer"
            this.ws.onopen = () => {
                const f = resolve
                resolve = null
                if (f) f()
            }
            this.ws.onerror = err => {
                this.disconnect(background)
                if (resolve) {
                    resolve = null
                    reject(err)
                }
            }
            this.ws.onclose = () => this.disconnect(background)
            this.ws.onmessage = (ev: MessageEvent<ArrayBuffer | string>) => {
                const { data } = ev
                if (typeof data == "string") {
                    const d = JSONTryParse(data, null)
                    if (d) this.emit(SIDE_DATA, d)
                } else {
                    const buffer = new Uint8Array(data)
                    this.handleFrame(buffer)
                }
            }
        })
    }

    protected transportSendPacketAsync(data: Uint8Array): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(data)
        }
        return Promise.resolve()
    }

    override sendSideData(data: any): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data))
            return Promise.resolve()
        } else {
            throw new Error(`socket closed, can't send side data`)
        }
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
): WebSocketTransport {
    return new WebSocketTransport(url, options)
}

import {
    ERROR_TRANSPORT_CLOSED,
    ERROR_TRANSPORT_WEBSOCKET_NOT_SUPPORTED,
    FRAME_SEND_DISCONNECT,
    SIDE_DATA,
    WEBSOCKET_TRANSPORT,
} from "../constants"
import { throwError } from "../error"
import { JSONTryParse } from "../utils"
import { Transport, TransportOptions } from "./transport"

const RECONNECT_TIMEOUT = 5000

/**
 * Transport creation options for web sockets
 * @category Transport
 */
export interface WebSocketTransportOptions extends TransportOptions {
    protocols: string | string[]
    WebSocket?: any
}

/**
 * Indicates if web sockets are supported by this platform. Checks that WebSocket and Blob are supported.
 * @returns
 */
export function isWebSocketTransportSupported() {
    return (
        typeof WebSocket !== "undefined" && typeof globalThis.Blob !== undefined
    )
}

export class WebSocketTransport extends Transport {
    private readonly protocols: string | string[]
    private ws: WebSocket
    private lastConnectTimestamp = 0
    private WebSocket: any

    constructor(readonly url: string, options?: WebSocketTransportOptions) {
        super(WEBSOCKET_TRANSPORT, options)
        this.WebSocket = options?.WebSocket || WebSocket
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
            this.ws = new this.WebSocket(this.url, this.protocols)
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
        if (this.ws?.readyState === this.WebSocket.OPEN) {
            this.ws.send(data)
        }
        return Promise.resolve()
    }

    override sendSideData(data: any): Promise<void> {
        if (this.ws?.readyState === this.WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data))
            return Promise.resolve()
        } else {
            throwError(`socket closed, can't send side data`, {
                code: ERROR_TRANSPORT_CLOSED,
            })
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
 * Creates a transport over a web socket connection. In Node.js, you will need to provide a WebSocket, Blob polyfill.
 *
 * ```javascript
 * import "websocket-polyfill"
 * import { Blob } from "buffer"
 * globalThis.Blob = Blob
 * ```
 * @category transport
 */
export function createWebSocketTransport(
    url: string,
    options?: WebSocketTransportOptions
): WebSocketTransport {
    if (!isWebSocketTransportSupported())
        throwError("WebSocket not supported", {
            code: ERROR_TRANSPORT_WEBSOCKET_NOT_SUPPORTED,
        })
    return new WebSocketTransport(url, options)
}

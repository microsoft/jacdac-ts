import { NODESOCKET_TRANSPORT } from "../constants"
import { bufferConcat } from "../utils"
import { Transport, TransportOptions } from "./transport"

/**
 * Transport creation options for TCP sockets
 * @category Transport
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NodeSocketTransportOptions extends TransportOptions {}

class NodeSocketTransport extends Transport {
    private sock: any

    constructor(
        readonly port: number = 8082,
        readonly host: string = "127.0.0.1",
        options?: NodeSocketTransportOptions
    ) {
        super(NODESOCKET_TRANSPORT, options)
        this.shared = true;
    }

    protected transportConnectAsync(background?: boolean): Promise<void> {
        return new Promise(resolve => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const net = require("net")
            this.sock = net.createConnection(this.port, this.host, resolve)
            this.sock.on("error", (e: any) => {
                if (!background) console.error(e)
                this.disconnect(background)
            })
            this.sock.on("end", () => this.disconnect(background))
            this.sock.setNoDelay()

            let acc: Uint8Array
            this.sock.on("data", (buf: Uint8Array) => {
                if (acc) {
                    buf = bufferConcat(acc, buf)
                    acc = null
                } else {
                    buf = new Uint8Array(buf)
                }
                while (buf) {
                    const endp = buf[0] + 1
                    if (buf.length >= endp) {
                        const pkt = buf.slice(1, endp)
                        if (buf.length > endp) buf = buf.slice(endp)
                        else buf = null
                        this.handleFrame(pkt)
                    } else {
                        acc = buf
                        buf = null
                    }
                }
            })
        })
    }

    protected transportSendPacketAsync(data: Uint8Array): Promise<void> {
        const buf = new Uint8Array(1 + data.length)
        buf[0] = data.length
        buf.set(data, 1)
        this.sock.write(buf)
        return Promise.resolve()
    }

    protected transportDisconnectAsync(background?: boolean): Promise<void> {
        try {
            this.sock?.end()
            this.sock = undefined
        } catch (e) {
            if (!background) throw e
        }
        return Promise.resolve()
    }

    toString() {
        return `socket transport (local port: ${this.sock?.localPort})`
    }
}

/**
 * Creates a transport over a TCP socket connection
 * @category transport
 */
export function createNodeSocketTransport(
    port?: number,
    host?: string,
    options?: NodeSocketTransportOptions
) {
    return new NodeSocketTransport(port, host, options)
}

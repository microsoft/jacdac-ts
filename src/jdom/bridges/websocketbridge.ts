import { JDBridge } from "../bridge"
import { CLOSE, CONNECT } from "../constants"

export class WebSocketBridge extends JDBridge {
    private _ws: WebSocket
    private _startPromise: Promise<void>

    constructor(
        name: string,
        readonly url: string,
        readonly protocols?: string | string[]
    ) {
        super(name, true)

        this.mount(() => this.close())
    }

    private close() {
        console.debug(`web bridge closed`, { url: this.url })
        const opened = !!this._ws || !!this._startPromise
        try {
            this._ws?.close()
            this._ws = undefined
            this._startPromise = undefined
        } catch (e) {
            console.warn(e)
        }
        if (opened) this.emit(CLOSE)
    }

    async connect() {
        if (this._ws) return Promise.resolve()
        if (!this._startPromise) {
            this._startPromise = new Promise<void>((resolve, reject) => {
                const ws = new WebSocket(this.url, this.protocols)
                ws.binaryType = "arraybuffer"
                ws.onopen = () => {
                    this._ws = ws
                    this._startPromise = undefined
                    console.debug(`web bridge opened`, { url: this.url })
                    this.emit(CONNECT)
                    resolve()
                }
                ws.onerror = e => {
                    console.debug(`web bridge error`, { url: this.url })
                    this.close()
                    reject()
                }
                ws.onclose = ev => {
                    console.debug(`web bridge onclose`, { ev })
                    this.close()
                }
                ws.onmessage = (ev: MessageEvent<ArrayBuffer>) => {
                    const { data } = ev
                    const buffer = new Uint8Array(data)
                    this.receiveFrameOrPacket(buffer)
                }
            })
        }
        return this._startPromise
    }

    protected sendPacket(data: Uint8Array, sender: string): void {
        this.connect()
        this._ws?.send(data)
    }
}

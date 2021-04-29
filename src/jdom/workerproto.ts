import Proto from "./proto"

export class WorkerProto implements Proto {
    private _frameHandler: (buf: Uint8Array) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private pending: {
        [id: string]: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            resolve: (t: any) => void
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            reject: (e: any) => void
        }
    } = {}

    constructor(private readonly worker: Worker) {
        this.worker.onmessage = this.handleMessage.bind(this)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private postMessageAsync<T>(msg: any) {
        const id = (msg.id = Math.random())
        const p = new Promise<T>((resolve, reject) => {
            this.worker.postMessage(msg)
            this.pending[id] = { resolve, reject }
        })
        return p
    }

    private handleMessage(ev: MessageEvent) {
        const { data } = ev
        const { type } = data || {}
        switch (type) {
            case "frame": {
                const { payload } = data
                this._frameHandler?.(payload)
                break
            }
            case "connect":
            case "disconnect": {
                const { id, error, response } = data
                const { resolve, reject } = this.pending[id] || {}
                if (resolve) {
                    if (error) reject(error)
                    else resolve(response)
                }
                break
            }
        }
    }

    onJDMessage(f: (buf: Uint8Array) => void): void {
        this._frameHandler = f
    }

    sendJDMessageAsync(buf: Uint8Array): Promise<void> {
        return this.postMessageAsync<void>({
            type: "frame",
            payload: buf,
        })
    }

    postConnectAsync(): Promise<void> {
        return this.postMessageAsync<void>({
            type: "connect",
        })
    }

    disconnectAsync(): Promise<void> {
        return this.postMessageAsync<void>({
            type: "disconnect",
        })
    }
}

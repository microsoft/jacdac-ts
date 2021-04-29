import { USB_TRANSPORT } from "../constants"
import { EventTargetObservable } from "../eventtargetobservable"
import { Observable } from "../observable"
import Packet from "../packet"
import { delay } from "../utils"
import { JDTransport } from "./transport"
import { isWebUSBEnabled, usbRequestDevice } from "./usb"
import { USB_FILTERS } from "./usbio"

class WorkerTransport extends JDTransport {
    private _cleanups: (() => void)[]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private pending: {
        [id: string]: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            resolve: (t: any) => void
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            reject: (e: any) => void
        }
    } = {}

    constructor(
        public readonly type: string,
        public readonly worker: Worker,
        public readonly options: {
            requestDevice: () => Promise<void>
            connectObservable?: Observable<void>
            disconnectObservable?: Observable<void>
        }
    ) {
        super(type)
        this.worker.onmessage = this.handleMessage.bind(this)
        this._cleanups = [
            this.options.connectObservable?.subscribe({
                next: async ev => {
                    console.log(
                        `usb device event: connect, `,
                        this.connectionState,
                        ev
                    )
                    if (this.bus.disconnected) {
                        await delay(500)
                        if (this.bus.disconnected) this.connect(true)
                    }
                },
            })?.unsubscribe,
            this.options.disconnectObservable?.subscribe({
                next: () => {
                    console.debug(`usb event: disconnect`)
                    this.disconnect()
                },
            })?.unsubscribe,
        ].filter(c => !!c)
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
        const { type, payload } = data || {}
        switch (type) {
            case "packet":
                this.handlePacket(payload)
                break
            case "frame":
                this.handleFrame(payload)
                break
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

    protected async transportSendPacketAsync(p: Packet): Promise<void> {
        // don't wait
        const buf = p.toBuffer()
        this.worker.postMessage({
            type: "packet",
            payload: buf,
        })
    }

    protected async transportConnectAsync(background?: boolean) {
        if (!background) {
            // request permission first
            await this.options.requestDevice()
        }

        // try connect
        await this.postMessageAsync<void>({
            type: "connect",
            background,
        })
    }

    protected transportDisconnectAsync(): Promise<void> {
        return this.postMessageAsync<void>({
            type: "disconnect",
        })
    }

    dispose() {
        super.dispose()
        this._cleanups.forEach(c => c())
        this._cleanups = []
    }
}

export function createUSBWorkerTransport(worker: Worker) {
    return (
        isWebUSBEnabled() &&
        new WorkerTransport(USB_TRANSPORT, worker, {
            requestDevice: () => usbRequestDevice(USB_FILTERS).then(() => {}),
            connectObservable: new EventTargetObservable(
                navigator.usb,
                "connect"
            ),
            disconnectObservable: new EventTargetObservable(
                navigator.usb,
                "disconnect"
            ),
        })
    )
}

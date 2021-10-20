import Packet from "../packet"
import Flags from "../flags"
import { SERIAL_TRANSPORT } from "../constants"
import Transport from "./transport"
import Proto from "./proto"
import WebSerialIO from "./webserialio"
import { HF2_IO } from "./hf2"
import { Observable } from "../observable"
import EventTargetObservable from "./eventtargetobservable"

export function isWebSerialEnabled(): boolean {
    return !!Flags.webSerial
}

export function isWebSerialSupported(): boolean {
    try {
        return (
            typeof navigator !== "undefined" &&
            !!navigator.serial &&
            !!navigator.serial.getPorts
        )
    } catch (e) {
        return false
    }
}

export interface WebSerialOptions {
    mkTransport: () => HF2_IO
    connectObservable?: Observable<void>
    disconnectObservable?: Observable<void>
}

export class WebSerialTransport extends Transport {
    private mkTransport: () => HF2_IO
    private hf2: Proto
    constructor(options: WebSerialOptions) {
        super(SERIAL_TRANSPORT, { ...options })
        this.mkTransport = options.mkTransport
    }

    protected async transportConnectAsync(background: boolean) {
        const transport = this.mkTransport()
        transport.onError = e => this.errorHandler(SERIAL_TRANSPORT, e)
        this.hf2 = await transport.connectAsync(background)
        this.hf2.onJDMessage(this.handleFrame.bind(this))
    }

    protected async transportSendPacketAsync(p: Packet) {
        if (!this.hf2) throw new Error("hf2 transport disconnected")

        const buf = p.toBuffer()
        await this.hf2.sendJDMessageAsync(buf)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async transportDisconnectAsync(background?: boolean) {
        const h = this.hf2
        this.hf2 = undefined
        if (h) await h.disconnectAsync()
    }
}

/**
 * Creates a transport over a Web Serial connection
 * @category Transport
 */
export function createWebSerialTransport(): Transport {
    if (!isWebSerialSupported()) return undefined

    const connectObservable = new EventTargetObservable(
        navigator.serial,
        "connect"
    )
    const disconnectObservable = new EventTargetObservable(
        navigator.serial,
        "disconnect"
    )
    return new WebSerialTransport({
        mkTransport: () => new WebSerialIO(),
        connectObservable,
        disconnectObservable,
    })
}

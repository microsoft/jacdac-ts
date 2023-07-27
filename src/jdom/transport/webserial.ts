import { Flags } from "../flags"
import { SERIAL_TRANSPORT } from "../constants"
import { Transport } from "./transport"
import { Proto } from "./proto"
import { WebSerialIO } from "./webserialio"
import { HF2_IO } from "./hf2"
import { Observable } from "../observable"
import { EventTargetObservable } from "./eventtargetobservable"
import { JDBus } from "../bus"

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
    mkTransport: (bus: JDBus) => HF2_IO
    connectObservable?: Observable<void>
    disconnectObservable?: Observable<void>
}

export class WebSerialTransport extends Transport {
    private mkTransport: (bus: JDBus) => HF2_IO
    private hf2: Proto
    private transport: HF2_IO
    constructor(options: WebSerialOptions) {
        super(SERIAL_TRANSPORT, { ...options, checkPulse: true })
        this.mkTransport = options.mkTransport
    }

    description(): string {
        return this.transport?.description()
    }

    protected async transportConnectAsync(background: boolean) {
        this.transport = this.mkTransport(this.bus)
        this.transport.onError = e => this.errorHandler(SERIAL_TRANSPORT, e)
        this.transport.onLog = line => this.handleLog(line)
        this.hf2 = await this.transport.connectAsync(background)
        this.hf2.onJDMessage(this.handleFrame.bind(this))
    }

    protected async transportSendPacketAsync(buf: Uint8Array) {
        if (!this.hf2) throw new Error("hf2 transport disconnected")
        await this.hf2.sendJDMessageAsync(buf)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async transportDisconnectAsync(background?: boolean) {
        const h = this.hf2
        this.hf2 = undefined
        this.transport = undefined
        if (h) await h.disconnectAsync()
    }
}

function defaultOptions(): WebSerialOptions {
    if (!isWebSerialSupported()) return undefined
    const connectObservable = new EventTargetObservable(
        navigator.serial,
        "connect"
    )
    const disconnectObservable = new EventTargetObservable(
        navigator.serial,
        "disconnect"
    )
    return {
        mkTransport: (bus: JDBus) => new WebSerialIO(bus),
        connectObservable,
        disconnectObservable,
    }
}

/**
 * Creates a transport over a Web Serial connection
 * @category Transport
 */
export function createWebSerialTransport(
    options?: WebSerialOptions
): Transport {
    if (!options) options = defaultOptions()
    return options && new WebSerialTransport(options)
}

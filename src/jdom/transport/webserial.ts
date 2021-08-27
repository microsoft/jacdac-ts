import Packet from "../packet"
import Flags from "../flags"
import { SERIAL_TRANSPORT, USB_TRANSPORT } from "../constants"
import Transport from "./transport"
import JDBus from "../bus"
import Proto from "./proto"
import WebSerialIO from "./webserialio"
import { createUSBTransport } from "./usb"
import { HF2_IO } from "./hf2"

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

class WebSerialTransport extends Transport {
    private hf2: Proto
    constructor(private mkTransport: () => HF2_IO) {
        super(SERIAL_TRANSPORT)
    }

    protected async transportConnectAsync(background: boolean) {
        const transport = this.mkTransport()
        transport.onError = e => this.errorHandler(USB_TRANSPORT, e)
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
 * @category
 */
export function createWebSerialTransport(
    mkTransport: () => HF2_IO = () => new WebSerialIO()
): Transport {
    return new WebSerialTransport(mkTransport)
}

/**
 * Creates a bus with a Web Serial connection
 * @category
 */
export function createWebSerialBus() {
    return new JDBus([createWebSerialTransport()])
}

export function createAnyUSBBus() {
    return new JDBus([createUSBTransport(), createWebSerialTransport()])
}

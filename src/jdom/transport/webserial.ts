import Packet from "../packet"
import Flags from "../flags"
import { USB_TRANSPORT } from "../constants"
import { JDTransport } from "./transport"
import { JDBus } from "../bus"
import Proto from "./proto"
import WebSerialIO from "./webserialio"
import { createUSBTransport } from "./usb"

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

class WebSerialTransport extends JDTransport {
    private hf2: Proto
    constructor() {
        super(USB_TRANSPORT)
    }

    protected async transportConnectAsync(background: boolean) {
        const transport = new WebSerialIO()
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


export function createWebSerialTransport(): JDTransport {
    return new WebSerialTransport()
}

export function createWebSerialBus() {
    return new JDBus([createWebSerialTransport()])
}

export function createAnyUSBBus() {
    return new JDBus([createUSBTransport(), createWebSerialTransport()])
}

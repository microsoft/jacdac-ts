import Packet from "../packet"
import { EventTargetObservable } from "../eventtargetobservable"
import Flags from "../flags"
import { USB_TRANSPORT } from "../constants"
import { JDTransport } from "./transport"
import { JDBus } from "../bus"
import Proto from "./proto"
import USBIO, { USBOptions } from "./usbio"

export function isWebUSBEnabled(): boolean {
    return !!Flags.webUSB
}

export function isWebUSBSupported(): boolean {
    try {
        return (
            typeof navigator !== "undefined" &&
            !!navigator.usb &&
            !!navigator.usb.getDevices
        )
    } catch (e) {
        return false
    }
}

export function usbRequestDevice(
    options?: USBDeviceRequestOptions
): Promise<USBDevice> {
    // disabled
    if (!Flags.webUSB) return Promise.resolve(undefined)

    try {
        return navigator?.usb?.requestDevice?.(options)
    } catch (e) {
        if (Flags.diagnostics) console.warn(e)
        return undefined
    }
}

function usbGetDevices(): Promise<USBDevice[]> {
    // disabled
    if (!Flags.webUSB) return Promise.resolve([])

    try {
        return navigator?.usb?.getDevices() || Promise.resolve([])
    } catch (e) {
        if (Flags.diagnostics) console.warn(e)
        return Promise.resolve([])
    }
}

class WebUSBTransport extends JDTransport {
    private hf2: Proto
    constructor(public readonly options: USBOptions) {
        super(USB_TRANSPORT, { ...options, checkPulse: true })
    }

    protected async transportConnectAsync(background: boolean) {
        const transport = new USBIO(this.options)
        transport.onError = e => this.errorHandler(USB_TRANSPORT, e)
        this.hf2 = await transport.connectAsync(background)
        this.hf2.onJDMessage(this.handleFrame.bind(this))
    }

    protected async transportSendPacketAsync(p: Packet) {
        if (!this.hf2) throw new Error("hf2 transport disconnected")

        const buf = p.toBuffer()
        await this.hf2.sendJDMessageAsync(buf)
    }

    protected async transportDisconnectAsync() {
        const h = this.hf2
        this.hf2 = undefined
        if (h) await h.disconnectAsync()
    }
}

function defaultOptions(): USBOptions {
    return (
        isWebUSBSupported() && {
            getDevices: usbGetDevices,
            requestDevice: usbRequestDevice,
            connectObservable: new EventTargetObservable(
                navigator.usb,
                "connect"
            ),
            disconnectObservable: new EventTargetObservable(
                navigator.usb,
                "disconnect"
            ),
        }
    )
}

export function createUSBTransport(options?: USBOptions): JDTransport {
    if (!options) options = defaultOptions()
    return options && new WebUSBTransport(options)
}

export function createUSBBus(options?: USBOptions) {
    return new JDBus([createUSBTransport(options)])
}

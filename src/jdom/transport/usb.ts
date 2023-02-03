import { Packet } from "../packet"
import { EventTargetObservable } from "./eventtargetobservable"
import { Flags } from "../flags"
import { USB_TRANSPORT } from "../constants"
import { Transport } from "./transport"
import { JDBus, BusOptions } from "../bus"
import { Proto } from "./proto"
import { USBIO, USBOptions } from "./usbio"

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

class WebUSBTransport extends Transport {
    private transport: USBIO
    private hf2: Proto
    constructor(public readonly options: USBOptions) {
        super(USB_TRANSPORT, { ...options, checkPulse: true })
    }

    description() {
        return this.transport?.description()
    }

    protected async transportConnectAsync(background: boolean) {
        this.transport = new USBIO(this.options)
        this.transport.onError = e => this.errorHandler(USB_TRANSPORT, e)
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

export function createUSBTransport(options?: USBOptions): Transport {
    if (!options) options = defaultOptions()
    return options && new WebUSBTransport(options)
}

export function createUSBBus(usbOptions?: USBOptions, options?: BusOptions) {
    return new JDBus([createUSBTransport(usbOptions)], options)
}

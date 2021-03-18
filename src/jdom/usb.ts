import { Transport, Proto } from "./hf2"
import Packet from "./packet"
import { Observable } from "./observable"
import { EventTargetObservable } from "./eventtargetobservable"
import Flags from "./flags"
import { USB_TRANSPORT } from "./constants"
import { JDTransport } from "./transport"
import { JDBus } from "./bus"
import { delay } from "./utils"
export interface USBOptions {
    getDevices: () => Promise<USBDevice[]>
    requestDevice: (options: USBDeviceRequestOptions) => Promise<USBDevice>
    connectObservable?: Observable<USBConnectionEvent>
    disconnectObservable?: Observable<USBConnectionEvent>
}

export function isWebUSBEnabled(): boolean {
    return !!Flags.webUSB
}

export function isWebUSBSupported(): boolean {
    try {
        return (
            typeof navigator !== "undefined" &&
            !!navigator.usb &&
            !!navigator.usb.requestDevice
        )
    } catch (e) {
        return false
    }
}

function usbRequestDevice(
    options?: USBDeviceRequestOptions
): Promise<USBDevice> {
    // disabled
    if (!Flags.webUSB) return Promise.resolve(undefined)

    try {
        return navigator?.usb?.requestDevice(options)
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

class USBTransport extends JDTransport {
    private hf2: Proto

    private _cleanups: (() => void)[]

    constructor(public readonly options: USBOptions) {
        super(USB_TRANSPORT)
        console.debug(`usb transport loaded`)
        this._cleanups = [
            this.options?.connectObservable?.subscribe({
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
            this.options?.disconnectObservable?.subscribe({
                next: () => {
                    console.debug(`usb event: disconnect`)
                    this.disconnect()
                },
            })?.unsubscribe,
        ].filter(c => !!c)
    }

    dispose() {
        super.dispose()
        this._cleanups.forEach(c => c())
        this._cleanups = [];
    }

    protected async transportConnectAsync(background: boolean) {
        if (this.hf2) {
            console.log(`cleanup hf2`)
            await this.hf2.disconnectAsync()
        }
        const transport = new Transport(this.options)
        transport.onError = e => {
            this.errorHandler(USB_TRANSPORT, e)
            this.disconnect()
        }
        const onJDMessage = (buf: Uint8Array) => {
            if (!this.hf2) console.warn("hf2: receiving on disconnected hf2")
            const pkts = Packet.fromFrame(buf, this.bus.timestamp)
            for (const pkt of pkts) {
                pkt.sender = USB_TRANSPORT
                this.bus.processPacket(pkt)
            }
        }
        this.hf2 = await transport.connectAsync(background)
        this.hf2.onJDMessage(onJDMessage)
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

export function createUSBTransport(options?: USBOptions): JDTransport {
    if (!options) {
        if (isWebUSBSupported()) {
            console.debug(`register usb events`)
            options = {
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
        }
    }
    return options && new USBTransport(options)
}

export function createUSBBus(options?: USBOptions) {
    return new JDBus([createUSBTransport(options)])
}

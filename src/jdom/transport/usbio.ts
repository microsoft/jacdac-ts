import { HF2Proto, HF2_DEVICE_MAJOR } from "./hf2"
import { CMSISProto } from "./microbit"
import { Observable } from "../observable"
import Proto from "./proto"
import { assert, delay, throwError } from "../utils"

export const USB_FILTERS = {
    filters: [
        {
            // hf2 devices (incl. arcade)
            classCode: 255,
            subclassCode: HF2_DEVICE_MAJOR,
        },
        {
            // micro:bit v2
            vendorId: 3368,
            productId: 516,
        },
    ],
}

const controlTransferGetReport = 0x01
const controlTransferSetReport = 0x09
const controlTransferOutReport = 0x200
const controlTransferInReport = 0x100

export interface USBOptions {
    getDevices: () => Promise<USBDevice[]>
    requestDevice?: (options: USBDeviceRequestOptions) => Promise<USBDevice>
    connectObservable?: Observable<void>
    disconnectObservable?: Observable<void>
}

export default class USBIO {
    private dev: USBDevice
    private iface: USBInterface
    private altIface: USBAlternateInterface
    private epIn: USBEndpoint
    private epOut: USBEndpoint
    private readLoopStarted = false
    private ready = false
    private rawMode = false

    constructor(public readonly options: USBOptions) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onData = (v: Uint8Array) => {}
    onError = (e: Error) => {
        console.warn("usb error: " + (e ? e.stack : e))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log(msg: string, v?: any) {
        if (v != undefined) console.log("usb: " + msg, v)
        else console.log("usb: " + msg)
    }

    private mkProto(): Proto {
        return this.isMicrobit() ? new CMSISProto(this) : new HF2Proto(this)
    }

    private clearDev() {
        if (this.dev) {
            this.dev = null
            this.epIn = null
            this.epOut = null
            this.onData = () => console.warn("rogue hf2 onData")
        }
    }

    disconnectAsync(): Promise<void> {
        this.ready = false
        if (!this.dev) return Promise.resolve()
        console.debug("close device")
        return this.dev
            .close()
            .catch(e => {
                // just ignore errors closing, most likely device just disconnected
                console.debug(e)
            })
            .then(() => {
                this.clearDev()
                return delay(500)
            })
    }

    recvPacketAsync(): Promise<Uint8Array> {
        if (!this.rawMode) this.error("rawMode required")
        return this.recvPacketCoreAsync()
    }

    private recvPacketCoreAsync(): Promise<Uint8Array> {
        const final = (res: USBInTransferResult) => {
            if (res.status != "ok") this.error("USB IN transfer failed")
            const arr = new Uint8Array(res.data.buffer)
            if (arr.length == 0) return this.recvPacketCoreAsync()
            return arr
        }

        if (!this.dev) return Promise.reject(new Error("Disconnected"))

        if (!this.epIn) {
            return this.dev
                .controlTransferIn(
                    {
                        requestType: "class",
                        recipient: "interface",
                        request: controlTransferGetReport,
                        value: controlTransferInReport,
                        index: this.iface.interfaceNumber,
                    },
                    64
                )
                .then(final)
        }

        return this.dev.transferIn(this.epIn.endpointNumber, 64).then(final)
    }

    error(msg: string) {
        this.onError(
            new Error(
                `device ${this.dev ? this.dev.productName : "n/a"} (${msg})`
            )
        )
    }

    private async readLoop() {
        if (this.rawMode || this.readLoopStarted) return
        this.readLoopStarted = true
        console.debug("start read loop")

        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (!this.ready) {
                break
                //await delay(300)
                //continue
            }

            try {
                const buf = await this.recvPacketCoreAsync()

                if (buf[0]) {
                    // we've got data; retry reading immedietly after processing it
                    this.onData(buf)
                } else {
                    // throttle down if no data coming
                    await delay(5)
                }
            } catch (err) {
                if (this.dev) {
                    this.onError(err)
                    await this.disconnectAsync()
                }
                await delay(300)
            }
        }
    }

    sendPacketAsync(pkt: Uint8Array) {
        if (!this.dev) return Promise.reject(new Error("Disconnected"))
        assert(pkt.length <= 64)
        if (!this.epOut) {
            return this.dev
                .controlTransferOut(
                    {
                        requestType: "class",
                        recipient: "interface",
                        request: controlTransferSetReport,
                        value: controlTransferOutReport,
                        index: this.iface.interfaceNumber,
                    },
                    pkt
                )
                .then(res => {
                    if (res.status != "ok")
                        this.error("USB CTRL OUT transfer failed")
                })
        }
        return this.dev
            .transferOut(this.epOut.endpointNumber, pkt)
            .then(res => {
                if (res.status != "ok") this.error("USB OUT transfer failed")
            })
    }

    private isMicrobit() {
        return (
            this.dev && this.dev.productId == 516 && this.dev.vendorId == 3368
        )
    }

    private checkDevice() {
        this.iface = undefined
        this.altIface = undefined
        if (!this.dev) return false
        console.debug(
            "connect device: " +
                this.dev.manufacturerName +
                " " +
                this.dev.productName
        )
        // resolve interfaces
        const subcl = this.isMicrobit() ? 0 : HF2_DEVICE_MAJOR
        for (const iface of this.dev.configuration.interfaces) {
            const alt = iface.alternates[0]
            if (alt.interfaceClass == 0xff && alt.interfaceSubclass == subcl) {
                this.iface = iface
                this.altIface = alt
                break
            }
        }
        if (this.isMicrobit()) this.rawMode = true
        return !!this.iface
    }

    private async tryReconnectAsync(deviceId?: string) {
        try {
            const devices = await this.options.getDevices()
            this.dev = deviceId
                ? devices.find(dev => dev.serialNumber === deviceId)
                : devices[0]
        } catch (e) {
            console.log(e)
            this.dev = undefined
        }
    }

    private async requestDeviceAsync() {
        try {
            this.dev = await this.options.requestDevice(USB_FILTERS)
        } catch (e) {
            console.log(e)
            this.dev = undefined
        }
    }

    async connectAsync(background: boolean, deviceId?: string) {
        await this.tryReconnectAsync(deviceId)
        if (!this.dev && !background) await this.requestDeviceAsync()
        // background call and no device, just give up for now
        if (!this.dev && background) throwError("device not paired", true)

        // let's connect
        await this.openDeviceAsync()

        const proto = this.mkProto()
        try {
            await proto.postConnectAsync()
        } catch (e) {
            console.debug(e)
            await proto.disconnectAsync()
            throw e
        }
        return proto
    }

    private async openDeviceAsync() {
        if (!this.dev) throwError("device not found")
        if (!this.checkDevice()) throwError("device does not support HF2")

        await this.dev.open()
        await this.dev.selectConfiguration(1)
        if (this.altIface.endpoints.length) {
            this.epIn = this.altIface.endpoints.filter(
                e => e.direction == "in"
            )[0]
            this.epOut = this.altIface.endpoints.filter(
                e => e.direction == "out"
            )[0]
            assert(this.epIn.packetSize == 64)
            assert(this.epOut.packetSize == 64)
        }
        console.debug("claim interface")
        await this.dev.claimInterface(this.iface.interfaceNumber)
        console.debug("all connected")
        this.ready = true
        this.readLoop()
    }
}

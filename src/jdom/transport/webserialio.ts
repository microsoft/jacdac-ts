import { HF2Proto, HF2_IO } from "./hf2"
import Proto from "./proto"
import { assert, delay, throwError, toHex, uint8ArrayToString } from "../utils"
import Flags from "../flags"
import errorCode, { JDError } from "../error"

export const WEB_SERIAL_FILTERS = {
    filters: [
        {
            usbVendorId: 0x303a, // espressif
        },
    ],
}

export default class WebSerialIO implements HF2_IO {
    private dev: SerialPort
    private readLoopStarted = false
    ready = false
    private writer: WritableStreamDefaultWriter<Uint8Array>

    constructor() {
        navigator.serial
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onData = (v: Uint8Array) => {}
    onError = (e: Error) => {
        console.warn(`usb error: ${errorCode(e) || ""} ${e ? e.stack : e}`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log(msg: string, v?: any) {
        if (Flags.diagnostics) {
            if (v != undefined) console.debug("usb: " + msg, v)
            else console.debug("usb: " + msg)
        }
    }

    private mkProto(): Proto {
        return new HF2Proto(this)
    }

    private clearDev() {
        if (this.dev) {
            this.dev = null
            this.onData = () => console.warn("rogue webserial hf2 onData")
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

    private devInfo() {
        if (!this.dev) return "n/a"
        const h = (n: number) => ("000" + n.toString(16)).slice(-4)
        const info = this.dev.getInfo()
        return h(info.usbVendorId) + ":" + h(info.usbProductId)
    }

    error(msg: string, code?: string) {
        const e = new JDError(`serial device ${this.devInfo()} (${msg})`, code)
        this.onError(e)
    }

    private async readLoop() {
        if (this.readLoopStarted) return

        this.readLoopStarted = true
        console.debug("start read loop")

        for (;;) {
            const reader = this.dev?.readable?.getReader()
            if (!reader) {
                await delay(100)
                continue
            }
            try {
                // eslint-disable-next-line no-constant-condition
                for (;;) {
                    const { value, done } = await reader.read()
                    if (done) {
                        // |reader| has been canceled.
                        break
                    }
                    // console.log("Recv", toHex(value))
                    this.onData(value)
                }
            } catch (e) {
                if (this.dev) this.onError(e)
                await delay(300)
            } finally {
                reader.releaseLock()
            }
        }
    }

    sendPacketAsync(pkt: Uint8Array) {
        if (!this.dev || !this.writer)
            return Promise.reject(new Error("Disconnected"))
        assert(pkt.length <= 64)
        // console.log("Send", toHex(pkt))
        if (pkt.length < 64) {
            const p = pkt
            pkt = new Uint8Array(64)
            pkt.set(p)
        }
        return this.writer.write(pkt)
    }

    private async tryReconnectAsync() {
        try {
            const ports = await navigator.serial.getPorts()
            this.dev = ports[0]
        } catch (e) {
            console.log(e)
            this.dev = undefined
        }
    }

    private async requestDeviceAsync() {
        try {
            this.dev = await navigator.serial.requestPort(WEB_SERIAL_FILTERS)
        } catch (e) {
            console.log(e)
            this.dev = undefined
        }
    }

    async connectAsync(background: boolean, deviceId?: string) {
        await this.tryReconnectAsync()
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

        await this.dev.open({
            baudRate: 115200, // not really
            bufferSize: 32 * 1024,
        })

        this.writer = this.dev.writable?.getWriter()
        if (!this.writer) throwError("no writer")
        this.ready = true
        /* no await */ this.readLoop()
    }
}

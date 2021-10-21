import { HF2Proto, HF2_IO } from "./hf2"
import Proto from "./proto"
import {
    assert,
    bufferConcat,
    delay,
    isCancelError,
    throwError,
} from "../utils"
import Flags from "../flags"
import JDError, { errorCode } from "../error"
import { deviceSpecifications } from "../spec"

function usbVendorIds() {
    return deviceSpecifications()
        .filter(spec => spec.transport?.type === "serial")
        .map(spec => spec.transport.vendorId)
        .filter(v => !!v)
}
export function matchVendorId(id: number) {
    if (isNaN(id)) return false

    const ids = usbVendorIds()
    return !isNaN(id) && ids.indexOf(id) > -1
}
export function matchFilter(port: SerialPort) {
    const info = port?.getInfo()
    const usbVendorId = info?.usbVendorId
    return matchVendorId(usbVendorId)
}
export default class WebSerialIO implements HF2_IO {
    private dev: SerialPort
    private readLoopStarted = false
    ready = false
    private writer: WritableStreamDefaultWriter<Uint8Array>
    private reader: ReadableStreamDefaultReader<Uint8Array>

    constructor() {}

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
        return this.cancelStreams()
            .catch(e => {
                // just ignore errors closing, most likely device just disconnected
                if (!isCancelError(e)) console.debug(e)
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

    private async cancelStreams() {
        if (this.reader)
            try {
                await this.reader.cancel()
                this.reader.releaseLock()
                // eslint-disable-next-line no-empty
            } catch {}
        try {
            this.writer.releaseLock()
            // eslint-disable-next-line no-empty
        } catch {}
        await this.dev.close()
    }

    private async readLoop() {
        if (this.readLoopStarted) return

        this.readLoopStarted = true
        console.debug("start read loop")

        const readpkt = async (
            reader: ReadableStreamDefaultReader<Uint8Array>
        ) => {
            let value: Uint8Array = null
            for (;;) {
                const tmp = await reader.read()
                if (tmp.done || !this.dev) return null // reader cancelled
                if (!value) value = tmp.value
                else value = bufferConcat(value, tmp.value)
                // Despite the fact that the device always sends full 64 bytes USB packets
                // the Windows serial driver will sometimes give only one character, and then the remaining
                // 63 in the second read - this must be going through some UART abstraction layers I guess... ¯\_(ツ)_/¯
                if (value && (value.length & 63) == 0) return value
            }
        }

        for (;;) {
            const reader = this.dev?.readable?.getReader()
            if (!reader) {
                await delay(100)
                continue
            }
            this.reader = reader
            console.debug("start new read loop round")
            try {
                // eslint-disable-next-line no-constant-condition
                for (;;) {
                    const value = await readpkt(reader)
                    if (!value) break
                    // console.log("Recv", toHex(value))
                    if (value.length > 64)
                        for (let i = 0; i < value.length; i += 64) {
                            this.onData(value.slice(i, i + 64))
                        }
                    else this.onData(value)
                }
            } catch (e) {
                if (this.dev) {
                    if (!isCancelError(e)) this.onError(e)
                }
                await delay(100)
            } finally {
                try {
                    reader.releaseLock()
                    // eslint-disable-next-line no-empty
                } catch (e) {}
                await delay(100)
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
            const filtered = ports.filter(matchFilter)
            this.dev = filtered[0]
        } catch (e) {
            if (!isCancelError(e)) console.debug(e)
            this.dev = undefined
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async requestDeviceAsync(deviceId?: string) {
        const WEB_SERIAL_FILTERS = {
            filters: usbVendorIds().map(usbVendorId => ({ usbVendorId })),
        }
        try {
            this.dev = await navigator.serial.requestPort(WEB_SERIAL_FILTERS)
            // TODO: deviceid
        } catch (e) {
            if (!isCancelError(e)) console.debug(e)
            this.dev = undefined
        }
    }

    async connectAsync(background: boolean, deviceId?: string) {
        await this.tryReconnectAsync()
        if (!this.dev && !background) await this.requestDeviceAsync(deviceId)
        // background call and no device, just give up for now
        if (!this.dev && background) throwError("device not paired", true)

        // let's connect
        await this.openDeviceAsync()

        const proto = this.mkProto()
        try {
            await proto.postConnectAsync()
        } catch (e) {
            if (!isCancelError(e)) console.debug(e)
            await proto.disconnectAsync()
            throw e
        }
        return proto
    }

    private async openDeviceAsync() {
        if (!this.dev) throwError("device not found", true)

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

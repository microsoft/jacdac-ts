import { HF2Proto, HF2_IO } from "./hf2"
import Proto from "./proto"
import { assert, bufferConcat, delay, throwError } from "../utils"
import Flags from "../flags"
import JDError, { errorCode } from "../error"
import { WEB_SERIAL_FILTERS } from "./webserialio"

interface Port {
    path: string
    manufacturer: string
    serialNumber: string
    pnpId: string
    locationId: string
    vendorId: string
    productId: string
}

function toPromise<T>(f: (cb: (err: Error, res: T) => void) => void) {
    return new Promise<T>((resolve, reject) =>
        f((err, result) => {
            if (err) reject(err)
            else resolve(result)
        })
    )
}

export default class NodeWebSerialIO implements HF2_IO {
    private dev: any
    private port: Port
    ready = false

    constructor(private SerialPort: any) {}

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
                console.debug(e)
            })
            .then(() => {
                this.clearDev()
                return delay(500)
            })
    }

    private devInfo() {
        if (!this.port) return "n/a"
        return this.port.vendorId + ":" + this.port.productId
    }

    error(msg: string, code?: string) {
        const e = new JDError(`serial device ${this.devInfo()} (${msg})`, code)
        this.onError(e)
    }

    private async cancelStreams() {
        await toPromise(cb => this.dev.close(cb))
    }

    sendPacketAsync(pkt: Uint8Array) {
        if (!this.dev) return Promise.reject(new Error("Disconnected"))
        assert(pkt.length <= 64)
        // console.log("Send", toHex(pkt))
        if (pkt.length < 64) {
            const p = pkt
            pkt = new Uint8Array(64)
            pkt.set(p)
        }
        return toPromise<void>(cb => this.dev.write(pkt, undefined, cb))
    }

    private async tryReconnectAsync() {
        try {
            this.dev = undefined
            this.port = undefined

            const ports: Port[] = await this.SerialPort.list()
            this.port = ports.filter(
                p =>
                    /^PX/.test(p.serialNumber) ||
                    WEB_SERIAL_FILTERS.filters.some(
                        f => f.usbVendorId == parseInt(p.vendorId, 16)
                    )
            )[0]

            if (this.port) {
                await toPromise(cb => {
                    this.dev = new this.SerialPort(
                        this.port.path,
                        { baudRate: 115200 },
                        cb
                    )
                })
                let tmpdata: Uint8Array
                this.dev.on("data", (buf: Uint8Array) => {
                    if (tmpdata) buf = bufferConcat(tmpdata, buf)
                    tmpdata = null

                    // This was only observed with WebSerial, but better safe than sorry
                    if (buf.length & 63) {
                        tmpdata = buf
                        return
                    }

                    if (buf.length > 64)
                        for (let i = 0; i < buf.length; i += 64) {
                            this.onData(buf.slice(i, i + 64))
                        }
                    else this.onData(buf)
                })
                this.dev.on("error", (err: any) => {
                    this.error(err.messsage || err + "")
                })
            }
        } catch (e) {
            console.log(e)
            this.dev = undefined
            this.port = undefined
        }
    }

    async connectAsync(background: boolean, deviceId?: string) {
        await this.tryReconnectAsync()
        if (!this.dev && background)
            throwError("can't find suitable device", true)

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
}

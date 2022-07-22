import { HF2Proto, HF2_IO } from "./hf2"
import { Proto } from "./proto"
import {
    assert,
    bufferConcat,
    delay,
    isCancelError,
    throwError,
} from "../utils"
import { Flags } from "../flags"
import { JDError, errorCode } from "../error"
import { WebSerialTransport } from "./webserial"
import { Transport } from "./transport"
import { Observable } from "../observable"
import { CONNECT, DISCONNECT } from "../constants"
import { JDEventSource } from "../eventsource"
import { JDBus } from "../bus"
import { JdUsbProto } from "./jdusb"

const SCAN_INTERVAL = 2500

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

async function listPorts(bus: JDBus, serialPort: any) {
    const ports: Port[] = await serialPort.list()
    return ports.filter(
        p =>
            /^(PX|JD)/.test(p.serialNumber) ||
            bus.deviceCatalog.matchVendorId("serial", parseInt(p.vendorId, 16))
    )
}

async function cancelStreams(dev: any) {
    await toPromise(cb => {
        if (!dev.isOpen) cb(undefined, undefined)
        else dev.close(cb)
    })
}

/**
 * @internal
 */
class NodeWebSerialIO implements HF2_IO {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private dev: any
    private port: Port
    isFreeFlowing: boolean = true

    /**
     *
     * @param SerialPort ``require("serialport")``
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(readonly bus: JDBus, private SerialPort: any) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onData = (v: Uint8Array) => {}
    onError = (e: Error) => {
        console.warn(`serial error: ${errorCode(e) || ""} ${e ? e.stack : e}`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log(msg: string, v?: any) {
        if (Flags.diagnostics) {
            if (v != undefined) console.debug("serial: " + msg, v)
            else console.debug("serial: " + msg)
        }
    }

    private clearDev() {
        if (this.dev) {
            this.dev = null
            this.port = null
        }
    }

    disconnectAsync(): Promise<void> {
        const d = this.dev
        if (!d) return Promise.resolve()

        this.clearDev()
        return cancelStreams(d)
            .catch(e => {
                // just ignore errors closing, most likely device just disconnected
                if (!isCancelError(e)) console.debug(e)
            })
            .then(() => delay(500))
    }

    private devInfo() {
        if (!this.port) return "n/a"
        return this.port.vendorId + ":" + this.port.productId
    }

    error(msg: string, code?: string) {
        const e = new JDError(`serial device ${this.devInfo()} (${msg})`, code)
        this.onError(e)
    }

    sendPacketAsync(pkt: Uint8Array) {
        if (!this.dev) {
            // device is disconnecting
            return Promise.resolve()
        }
        assert(pkt.length <= 64)
        // console.log("Send", toHex(pkt))
        if (pkt.length < 64) {
            const p = pkt
            pkt = new Uint8Array(64)
            pkt.set(p)
        }
        return toPromise<void>(cb => this.dev.write(pkt, undefined, cb))
    }

    private async tryReconnectAsync(deviceId?: string) {
        try {
            this.dev = undefined
            this.port = undefined

            const ports = await listPorts(this.bus, this.SerialPort)
            this.port = ports?.[0]
            if (this.port) {
                console.debug(`serial: found ${this.port.serialNumber}`)
                await toPromise(cb => {
                    this.dev = new this.SerialPort(
                        this.port.path,
                        { baudRate: 2000000 },
                        cb
                    )
                })
                let tmpdata: Uint8Array
                this.dev.on("data", (buf: Uint8Array) => {
                    if (this.isFreeFlowing) {
                        this.onData(buf)
                        return
                    }

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
                this.dev.on("close", () => this.disconnectAsync())
            }
        } catch (e) {
            if (!isCancelError(e)) console.debug(e)
            this.dev = undefined
            this.port = undefined
        }
    }

    async connectAsync(background: boolean, deviceId?: string) {
        await this.tryReconnectAsync(deviceId)
        if (!this.dev && background)
            throwError("can't find suitable device", true)
        if (!this.dev) throwError("device not found", true)
        console.debug(`serial: found ${this.devInfo()}`)

        const jdusb = new JdUsbProto(this)
        let proto: Proto = jdusb
        try {
            const isHF2 = await jdusb.detectHF2()
            if (isHF2) proto = new HF2Proto(this)
            await proto.postConnectAsync()
        } catch (e) {
            if (!isCancelError(e)) console.debug(e)
            await proto.disconnectAsync()
            throw e
        }

        return proto
    }
}

class SerialPortWatch extends JDEventSource {
    bus: JDBus
    constructor(readonly SerialPort: any) {
        super()

        this.watch()
    }

    watch() {
        let knownPortIds: string[] = []
        const interval = setInterval(async () => {
            if (!this.bus) return

            const ports: Port[] = await listPorts(this.bus, this.SerialPort)
            const portIds = ports.map(port => port.serialNumber || port.path)
            const added = portIds.filter(id => knownPortIds.indexOf(id) < 0)
            const removed = knownPortIds.filter(id => portIds.indexOf(id) < 0)
            if (added.length || removed.length)
                console.debug(
                    `detected serial port change + ${added.join(
                        ", "
                    )} - ${removed.join(", ")}`
                )

            knownPortIds = portIds
            if (added.length) this.emit(CONNECT)
            if (removed.length) this.emit(DISCONNECT)
        }, SCAN_INTERVAL)
        return {
            unsubscribe: () => clearInterval(interval),
        }
    }
}

/**
 * Creates a transport over a Web Serial connection
 * @param SerialPort the serialport node package
 * @category Transport
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createNodeWebSerialTransport(SerialPort: any): Transport {
    const watch = new SerialPortWatch(SerialPort)
    const connectObservable: Observable<void> = {
        subscribe: observer => ({
            unsubscribe: watch.subscribe(CONNECT, observer.next),
        }),
    }
    const disconnectObservable: Observable<void> = {
        subscribe: observer => ({
            unsubscribe: watch.subscribe(DISCONNECT, observer.next),
        }),
    }
    return new WebSerialTransport({
        mkTransport: (bus: JDBus) => {
            watch.bus = bus
            return new NodeWebSerialIO(bus, SerialPort)
        },
        connectObservable,
        disconnectObservable,
    })
}

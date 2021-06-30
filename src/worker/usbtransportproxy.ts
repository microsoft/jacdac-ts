import { JACDAC_ERROR, JDError } from "../jdom/error"
import Proto from "../jdom/transport/proto"
import USBIO from "../jdom/transport/usbio"
import TransportProxy from "./transportproxy"

const { debug } = console

export class USBTransportProxy implements TransportProxy {
    private hf2: Proto
    constructor() {}
    async connect(deviceId: string) {
        debug(`jdsw: connect`, { deviceId })
        if (this.hf2) {
            debug(`jdsw: cleanup hf2`)
            await this.hf2.disconnectAsync()
            this.hf2 = undefined
        }
        const io = new USBIO({
            getDevices: () => navigator.usb.getDevices(),
        })
        io.onError = e => {
            debug(`jdsw: error`, e)
            postMessage({
                jacdac: true,
                type: "error",
                error: {
                    message: e.message,
                    stack: e.stack,
                    name: e.name,
                    jacdacName:
                        e.name === JACDAC_ERROR
                            ? (e as JDError).jacdacName
                            : undefined,
                },
            })
        }
        const onJDMessage = (buf: Uint8Array) => {
            postMessage({
                jacdac: true,
                type: "frame",
                payload: buf,
            })
        }
        this.hf2 = await io.connectAsync(true, deviceId)
        this.hf2.onJDMessage(onJDMessage)
    }
    async send(payload: Uint8Array) {
        await this.hf2?.sendJDMessageAsync(payload)
    }
    async disconnect() {
        debug(`jdsw: disconnect`)
        const h = this.hf2
        this.hf2 = undefined
        if (h) await h.disconnectAsync()
    }
}

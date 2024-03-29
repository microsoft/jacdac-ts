import { errorCode } from "../jdom/error"
import { Flags } from "../jdom/flags"
import { Proto } from "../jdom/transport/proto"
import { USBIO } from "../jdom/transport/usbio"
import { TransportProxy } from "./transportproxy"

const { debug } = console

export class USBTransportProxy implements TransportProxy {
    private hf2: Proto
    constructor() {}
    async connect(deviceId: string) {
        if (Flags.diagnostics) debug(`jdsw: connect`, { deviceId })
        if (this.hf2) {
            if (Flags.diagnostics) debug(`jdsw: cleanup hf2`)
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
                    jacdacName: errorCode(e),
                },
            })
        }
        const onJDMessage = (buf: Uint8Array) => {
            self.postMessage({
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
        if (Flags.diagnostics) debug(`jdsw: disconnect`)
        const h = this.hf2
        this.hf2 = undefined
        if (h) await h.disconnectAsync()
    }
}

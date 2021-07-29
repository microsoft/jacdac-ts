import { JACDAC_ERROR } from "../jdom/constants"
import { JDError } from "../jdom/error"
import TransportProxy from "./transportproxy"
import { USBTransportProxy } from "./usbtransportproxy"

const { debug } = console

debug(`jdsw: starting...`)
let proxy: TransportProxy

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleError(resp: any, e: Error) {
    self.postMessage({
        ...resp,
        error: {
            message: e.message,
            stack: e.stack,
            name: e.name,
            jacdacName:
                e.name === JACDAC_ERROR ? (e as JDError).jacdacName : undefined,
        },
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCommand(resp: any, handler: () => Promise<void>) {
    try {
        await handler()
        self.postMessage(resp)
    } catch (e) {
        handleError(resp, e)
    }
}

async function handleMessage(event: MessageEvent) {
    const { data } = event
    const { jacdac, type, payload } = data
    if (!jacdac) return // someone else's message
    switch (type) {
        case "connect": {
            if (proxy) await proxy.disconnect()
            const { deviceId } = data
            debug(`jdsw: connecting`)
            proxy = new USBTransportProxy()
            await handleCommand(data, () => proxy.connect(deviceId))
            break
        }
        case "packet":
            //info(`jdsw: send`)
            proxy?.send(payload).then(
                () => {},
                e => handleError(payload, e)
            )
            // don't wait or acknowledge
            break
        case "disconnect":
            if (proxy) {
                debug(`jdsw: disconnecting`)
                await handleCommand(data, () => proxy?.disconnect())
            }
            break
    }
}

self.addEventListener("message", handleMessage)

debug(`jdsw: ready...`)

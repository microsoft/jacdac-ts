import { JACDAC_ERROR, JDError } from "../jdom/error"
import TransportProxy from "./transportproxy"
import { USBTransportProxy } from "./usbtransportproxy"

const { debug } = console

debug(`jdsw: starting...`)
let proxy: TransportProxy

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleError(resp: any, e: Error) {
    postMessage({
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
        postMessage(resp)
    } catch (e) {
        handleError(resp, e)
    }
}

onmessage = async event => {
    const { data } = event
    const { type, payload } = data
    //console.debug(`jdsw, onmessage ${type}`, data)
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

debug(`jdsw: ready...`)

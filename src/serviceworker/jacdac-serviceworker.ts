import TransportProxy from "./transportproxy"
import { USBTransportProxy } from "./usbtransportproxy"

const { debug, error } = console

debug(`jdsw: starting...`)
let proxy: TransportProxy

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCommand(resp: any, handler: () => Promise<void>) {
    try {
        await handler()
        postMessage(resp)
    } catch (e) {
        postMessage({
            ...resp,
            error: {
                message: e.message,
            },
        })
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
                e => error(e)
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

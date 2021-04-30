import TransportProxy from "./transportproxy"
import { USBTransportProxy } from "./usbtransportproxy"

const { info, error } = console

info(`jdsw: starting...`)
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
        case "connect":
            if (proxy) await proxy.disconnect()
            //const { transport } = data
            info(`jdsw: connecting`)
            proxy = new USBTransportProxy()
            await handleCommand(data, () => proxy.connect())
            break
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
                info(`jdsw: disconnecting`)
                await handleCommand(data, () => proxy.disconnect())
            }
            break
    }
}

info(`jdsw: ready...`)

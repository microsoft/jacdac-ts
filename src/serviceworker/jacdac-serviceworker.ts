import TransportProxy from "./transportproxy"
import { USBTransportProxy } from "./usbtransportproxy"

const { info } = console

info(`jdsw: starting...`)
let proxy: TransportProxy

onmessage = async event => {
    const { data } = event
    const { type } = data
    console.debug(`jdsw onmessage`, data)
    switch (type) {
        case "connect":
            if (proxy) await proxy.disconnect()
            //const { transport } = data
            info(`jdsw: connecting`)
            proxy = new USBTransportProxy()
            await proxy.connect()
            postMessage(data, "*")
            break
        case "packet":
            info(`jdsw: send`)
            proxy?.send(data)
            // don't wait or acknowledge
            break
        case "disconnect":
            info(`jdsw: disconnecting`)
            await proxy?.disconnect()
            postMessage(data, "*")
            break
    }
}

info(`jdsw: ready...`)

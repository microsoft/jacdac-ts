import { Proto, Transport } from "../jdom/hf2"

const { log, debug, error } = console

log(`starting jacdac service worker`)

let hf2: Proto

onmessage = async event => {
    const { data } = event
    const { type } = data
    console.debug(`jdsw onmessage`, data)
    switch (type) {
        case "connect":
            await transportConnectAsync()
            break
        case "frame":
            await transportSendPacketAsync(data)
            break
        case "disconnect":
            await transportDisconnectAsync()
            break
    }
}

const transportConnectAsync = async () => {
    log(`jdsw: connect`)
    if (hf2) {
        debug(`jdsw: cleanup hf2`)
        await hf2.disconnectAsync()
        hf2 = undefined
    }
    const transport = new Transport({
        getDevices: () => navigator.usb.getDevices(),
    })
    transport.onError = e => {
        error(e)
        postMessage(
            {
                type: "error",
                error: {
                    message: e.message,
                },
            },
            "*"
        )
    }
    const onJDMessage = (buf: Uint8Array) =>
        postMessage(
            {
                type: "frame",
                payload: buf,
            },
            "*"
        )
    hf2 = await transport.connectAsync(true)
    hf2.onJDMessage(onJDMessage)
}
const transportSendPacketAsync = async (data: { payload: Uint8Array }) => {
    const { payload } = data
    await hf2?.sendJDMessageAsync(payload)
}
const transportDisconnectAsync = async () => {
    log(`jdsw: disconnect`)
    const h = hf2
    hf2 = undefined
    if (h) await h.disconnectAsync()
}

namespace hidevents {
    // all settings keys are prefixed with this string
    const PREFIX = "@ke_"
    // data layout format (18bytes)
    const FORMAT = "b[8] u32 u8 u8 u16 u16"
    // data layout types
    //type FORMAT_TYPE = [Buffer, number, number, number, number, number]
    let bindings: any[][] = []

    function decodeBindings() {
        const keys = jacdac.settingsServer.list(PREFIX)
        console.log(`decoding bindings (${keys.length})`)
        bindings = []
        for (const key of keys) {
            try {
                const payload = jacdac.settingsServer.readBuffer(key)
                const binding = jacdac.jdunpack(
                    payload,
                    "b[8] u32 u8 u8 u16 u16"
                )
                const bf: Buffer = binding[0]
                binding[0] = bf.toHex()
                bindings.push(binding)
            } catch (e) {
                // this key is broken
                console.log(`binding ${key} corrupted`)
                //jacdac.settingsServer.delete(key)
            }
        }
    }

    function handleEvent(pkt: jacdac.JDPacket) {
        const deviceId = pkt.deviceIdentifier
        const serviceIndex = pkt.serviceIndex
        const eventCode = pkt.eventCode
        for (const binding of bindings) {
            if (
                binding[0] === deviceId &&
                binding[2] === serviceIndex &&
                binding[3] === eventCode
            ) {
                // we have a hit!
                console.log(`key ${binding[4]} ${binding[5]}`)
                servers.hidKeyboardServer.key(binding[4], binding[5], KeyboardKeyEvent.Press)
            }
        }
    }

    function start() {
        // start services
        jacdac.start({ disableRoleManager: true })
        jacdac.settingsServer.start()
        jacdac.settingsServer.on(jacdac.CHANGE, () => decodeBindings())
        jacdac.bus.on(jacdac.EVENT, pkt => handleEvent(pkt))

        // decode and start
        decodeBindings()
    }

    start()
}

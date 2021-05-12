namespace servers {
    export class HIDKeyboardServer extends jacdac.Server {
        constructor(dev: string) {
            super(dev, jacdac.SRV_HID_KEYBOARD)
        }

        handleClearCommand(packet: jacdac.JDPacket) {
            keyboard.clearAllKeys()
        }

        private selectorToKey(selector: number) {
            if (selector >= 0x04 && selector <= 0x1d) // a-z
                return String.fromCharCode("a".charCodeAt(0) + (selector - 0x04))
            if (selector >= 0x1e && selector <= 0x26) // 1-9
                return String.fromCharCode("1".charCodeAt(0) + (selector - 0x1e))            
            switch(selector) {
                case 0x27: return "0"
            }
            return ""
        }

        handleKeyCommand(packet: jacdac.JDPacket) {
            let upacked = packet.jdunpack<number[]>("r: u16 u8 u8")

            // each key press is represented by 32 bits, unpacked into three "numbers"
            for (let i = 0; i < upacked.length / 3; i += 3) {
                const selector = upacked[i]
                const key = this.selectorToKey(selector)
                const modifier = upacked[i + 1] & ~0xe
                const action = upacked[i + 2]
                if (modifier) keyboard.modifierKey(modifier, action)
                if (key) keyboard.key(key, action)
            }
        }

        handlePacket(packet: jacdac.JDPacket) {
            switch (packet.serviceCommand) {
                case jacdac.HidKeyboardCmd.Clear:
                    this.handleClearCommand(packet)
                    break
                case jacdac.HidKeyboardCmd.Key:
                    this.handleKeyCommand(packet)
                    break
            }
        }
    }

    //% fixedInstance whenUsed block="keyboard"
    export const hidKeyboardServer = new HIDKeyboardServer("keyboard")
}

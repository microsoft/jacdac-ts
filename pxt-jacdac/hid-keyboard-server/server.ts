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
            switch (selector) {
                case 0x27: return "0"
            }
            return ""
        }

        private selectorToFunction(selector: number): KeyboardFunctionKey {
            if (selector >= 0x28 && selector <= 0x73)
                return selector
            else
                return 0
        }

        private selectorToMedia(selector: number): KeyboardMediaKey {
            if (selector >= 0x74 && selector <= 0x81)
                return selector
            else
                return 0
        }

        handleKeyCommand(packet: jacdac.JDPacket) {
            const [keys] = packet.jdunpack<number[][][]>("r: u16 u8 u8")

            const REPORT_DELAY = 20
            // each key press is represented by 32 bits, unpacked into three "numbers"
            for (let i = 0; i < keys.length; i++) {
                const upacked = keys[i]
                const selector = upacked[i]
                const key = this.selectorToKey(selector)
                const fcn = this.selectorToFunction(selector)
                const media = this.selectorToMedia(selector)
                const modifier = upacked[i + 1] & ~0xe
                const action = upacked[i + 2]

                this.log(`mods ${modifier}`)
                this.log(`key ${key}`)
                this.log(`fcn ${fcn}`)
                this.log(`media ${media}`)

                if (action === jacdac.HidKeyboardAction.Press) {
                    if (modifier) keyboard.modifierKey(modifier, KeyboardKeyEvent.Down)
                    pause(REPORT_DELAY)
                    if (key) keyboard.key(key, KeyboardKeyEvent.Down)
                    if (fcn) keyboard.functionKey(fcn, KeyboardKeyEvent.Down)
                    if (media) keyboard.mediaKey(media, KeyboardKeyEvent.Down)
                    pause(REPORT_DELAY)
                    if (key) keyboard.key(key, KeyboardKeyEvent.Up)
                    if (fcn) keyboard.functionKey(fcn, KeyboardKeyEvent.Up)
                    if (media) keyboard.mediaKey(media, KeyboardKeyEvent.Up)
                    pause(REPORT_DELAY)
                    if (modifier) keyboard.modifierKey(modifier, KeyboardKeyEvent.Up)
                    pause(REPORT_DELAY)
                } else {
                    if (modifier) keyboard.modifierKey(modifier, action)
                    pause(REPORT_DELAY)
                    if (key) keyboard.key(key, action)
                    if (fcn) keyboard.functionKey(fcn, action)
                    if (media) keyboard.mediaKey(media, action)
                    pause(REPORT_DELAY)
                }
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

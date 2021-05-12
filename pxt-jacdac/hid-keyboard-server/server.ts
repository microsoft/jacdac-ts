namespace servers {
    export class HIDKeyboardServer extends jacdac.Server {
        constructor(dev: string) {
            super(dev, jacdac.SRV_HID_KEYBOARD)

            // todo events
        }

        handleClearCommand(packet: jacdac.JDPacket) {
            keyboard.clearAllKeys()
        }

        handleKeyCommand(packet: jacdac.JDPacket) {
            let upacked = packet.jdunpack<number[]>("r: u16 u8 u8")

            // each key press is represented by 32 bits, unpacked into three "numbers"
            for (let i = 0; i < upacked.length / 3; i += 3) {
                const selector = upacked[i]
                const modifier = upacked[i + 1]
                const action = upacked[i + 2]
                if (modifier == 0) keyboard.key(selector.toString(), action)
                else {
                    let mapped = 0
                    switch (modifier) {
                        case jacdac.HidKeyboardModifiers.LeftControl:
                            mapped = KeyboardModifierKey.Control
                            break
                        case jacdac.HidKeyboardModifiers.LeftShift:
                            mapped = KeyboardModifierKey.Shift
                            break
                        case jacdac.HidKeyboardModifiers.LeftAlt:
                            mapped = KeyboardModifierKey.Alt
                            break
                        case jacdac.HidKeyboardModifiers.LeftGUI:
                            mapped = KeyboardModifierKey.Meta
                            break
                        case jacdac.HidKeyboardModifiers.RightControl:
                            mapped = KeyboardModifierKey.RightControl
                            break
                        case jacdac.HidKeyboardModifiers.RightShift:
                            mapped = KeyboardModifierKey.RightShift
                            break
                        case jacdac.HidKeyboardModifiers.RightAlt:
                            mapped = KeyboardModifierKey.RightAlt
                            break
                        case jacdac.HidKeyboardModifiers.RightGUI:
                            mapped = KeyboardModifierKey.RightMeta
                            break
                    }

                    if (mapped) keyboard.modifierKey(mapped, action)
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

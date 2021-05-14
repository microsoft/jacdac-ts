namespace servers {
    const REPORT_DELAY = 20

    export class HIDKeyboardServer extends jacdac.Server {
        constructor(dev: string) {
            super(dev, jacdac.SRV_HID_KEYBOARD)
        }

        handleClearCommand(packet: jacdac.JDPacket) {
            keyboard.clearAllKeys()
        }

        private selectorToKey(selector: number) {
            // a-z
            if (selector >= 0x04 && selector <= 0x1d)
                return String.fromCharCode(
                    "a".charCodeAt(0) + (selector - 0x04)
                )
            // 1-9
            if (selector >= 0x1e && selector <= 0x26)
                return String.fromCharCode(
                    "1".charCodeAt(0) + (selector - 0x1e)
                )

            switch (selector) {
                case 0x27:
                    return "0"
            }
            return ""
        }

        private selectorToFunction(selector: number): KeyboardFunctionKey {
            // KeyboardFunctionKey uses HID values directly
            switch (selector) {
                case KeyboardFunctionKey.F1Key:
                case KeyboardFunctionKey.F2Key:
                case KeyboardFunctionKey.F3Key:
                case KeyboardFunctionKey.F4Key:
                case KeyboardFunctionKey.F5Key:
                case KeyboardFunctionKey.F6Key:
                case KeyboardFunctionKey.F7Key:
                case KeyboardFunctionKey.F8Key:
                case KeyboardFunctionKey.F9Key:
                case KeyboardFunctionKey.F10Key:
                case KeyboardFunctionKey.F11Key:
                case KeyboardFunctionKey.F12Key:
                case KeyboardFunctionKey.F13Key:
                case KeyboardFunctionKey.F14Key:
                case KeyboardFunctionKey.F15Key:
                case KeyboardFunctionKey.F16Key:
                case KeyboardFunctionKey.F17Key:
                case KeyboardFunctionKey.F18Key:
                case KeyboardFunctionKey.F19Key:
                case KeyboardFunctionKey.F20Key:
                case KeyboardFunctionKey.F21Key:
                case KeyboardFunctionKey.F22Key:
                case KeyboardFunctionKey.F23Key:
                case KeyboardFunctionKey.F24Key:
                case KeyboardFunctionKey.Enter:
                case KeyboardFunctionKey.Esc:
                case KeyboardFunctionKey.Backspace:
                case KeyboardFunctionKey.Tab:
                case KeyboardFunctionKey.CapsLock:
                case KeyboardFunctionKey.NumLock:
                case KeyboardFunctionKey.KeypadSlash:
                case KeyboardFunctionKey.KeypadAsterisk:
                case KeyboardFunctionKey.KeypadMinus:
                case KeyboardFunctionKey.KeypadPlus:
                case KeyboardFunctionKey.KeypadEnter:
                case KeyboardFunctionKey.Keypad1:
                case KeyboardFunctionKey.Keypad2:
                case KeyboardFunctionKey.Keypad3:
                case KeyboardFunctionKey.Keypad4:
                case KeyboardFunctionKey.Keypad5:
                case KeyboardFunctionKey.Keypad6:
                case KeyboardFunctionKey.Keypad7:
                case KeyboardFunctionKey.Keypad8:
                case KeyboardFunctionKey.Keypad9:
                case KeyboardFunctionKey.Keypad0:
                case KeyboardFunctionKey.KeypadDot:
                case KeyboardFunctionKey.Compose:
                case KeyboardFunctionKey.Power:
                case KeyboardFunctionKey.KeypadEqual:
                case KeyboardFunctionKey.Open:
                case KeyboardFunctionKey.Help:
                case KeyboardFunctionKey.Props:
                case KeyboardFunctionKey.Front:
                case KeyboardFunctionKey.Stop:
                case KeyboardFunctionKey.Again:
                case KeyboardFunctionKey.Undo:
                case KeyboardFunctionKey.Cut:
                case KeyboardFunctionKey.Copy:
                case KeyboardFunctionKey.Paste:
                case KeyboardFunctionKey.Find:
                case KeyboardFunctionKey.Mute:
                case KeyboardFunctionKey.VolumeUp:
                case KeyboardFunctionKey.VolumeDown:
                case KeyboardFunctionKey.KeypadComma:
                case KeyboardFunctionKey.KeypadJumpComma:
                case KeyboardFunctionKey.KeypadLeftParenthesis:
                case KeyboardFunctionKey.KeypadRightParenthesis:
                case KeyboardFunctionKey.PrintScreen:
                case KeyboardFunctionKey.ScrollLock:
                case KeyboardFunctionKey.Pause:
                case KeyboardFunctionKey.Insert:
                case KeyboardFunctionKey.Home:
                case KeyboardFunctionKey.PageUp:
                case KeyboardFunctionKey.DeleteForward:
                case KeyboardFunctionKey.End:
                case KeyboardFunctionKey.PageDown:
                case KeyboardFunctionKey.RightArrow:
                case KeyboardFunctionKey.LeftArrow:
                case KeyboardFunctionKey.DownArrow:
                case KeyboardFunctionKey.UpArrow:
                    return selector
                default:
                    return 0
            }
        }

        private selectorToMedia(selector: number): KeyboardMediaKey {
            // KeyboardMediaKey is an enum starting at 0
            switch (selector) {
                case DAL.KEY_MUTE: return KeyboardMediaKey.Mute
                case DAL.KEY_VOLUMEUP: return KeyboardMediaKey.VolumeUp
                case DAL.KEY_VOLUMEDOWN: return KeyboardMediaKey.VolumeUp
                case DAL.KEY_MEDIA_PLAYPAUSE: return KeyboardMediaKey.PlayPause
                case DAL.KEY_MEDIA_STOP: return KeyboardMediaKey.Stop
                case DAL.KEY_MEDIA_PREVIOUSSONG: return KeyboardMediaKey.PreviousTrack
                case DAL.KEY_MEDIA_NEXTSONG: return KeyboardMediaKey.NextTrack
                /*
                case DAL.KEY_Mail:
                case DAL.KEY_Calculator:
                case DAL.KEY_WebSearch:
                case DAL.KEY_WebHome:
                case DAL.KEY_WebFavourites:
                case DAL.KEY_WebRefresh:
                case DAL.KEY_WebStop:
                case DAL.KEY_WebForward:
                case DAL.KEY_WebBack:
                */
                default:
                    return 0
            }
        }

        handleKeyCommand(packet: jacdac.JDPacket) {
            const [keys] = packet.jdunpack<number[][][]>("r: u16 u8 u8")

            // each key press is represented by 32 bits, unpacked into three "numbers"
            for (let i = 0; i < keys.length; i++) {
                const upacked = keys[i]
                const selector = upacked[i]
                const modifiers = upacked[i + 1]
                const action = upacked[i + 2]

                const fcn = this.selectorToFunction(selector)
                const media = this.selectorToMedia(selector)
                const key = this.selectorToKey(selector)

                this.log(["press", "down", "up"][action]);
                if (modifiers) this.log(`mods ${modifiers}`)
                if (fcn) this.log(`fcn ${fcn}`)
                if (media) this.log(`media ${media}`)
                if (key) this.log(`key ${key}`)

                if (action === jacdac.HidKeyboardAction.Press) {
                    keyboard.modifierKey(modifiers, KeyboardKeyEvent.Down)
                    if (fcn) keyboard.functionKey(fcn, KeyboardKeyEvent.Down)
                    else if (media)
                        keyboard.mediaKey(media, KeyboardKeyEvent.Down)
                    else if (key) keyboard.key(key, KeyboardKeyEvent.Down)
                    pause(REPORT_DELAY)
                    if (fcn) keyboard.functionKey(fcn, KeyboardKeyEvent.Up)
                    else if (media)
                        keyboard.mediaKey(media, KeyboardKeyEvent.Up)
                    else if (key) keyboard.key(key, KeyboardKeyEvent.Up)
                    pause(REPORT_DELAY)
                    keyboard.modifierKey(modifiers, KeyboardKeyEvent.Up)
                    pause(REPORT_DELAY)
                    // just to make sure
                    keyboard.clearAllKeys()
                } else {
                    keyboard.modifierKey(modifiers, action)
                    if (fcn) keyboard.functionKey(fcn, action)
                    else if (media) keyboard.mediaKey(media, action)
                    else if (key) keyboard.key(key, action)
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

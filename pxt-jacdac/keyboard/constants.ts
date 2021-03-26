namespace jacdac {
    // Service: Keyboard
    export const SRV_KEYBOARD = 0x18b05b6a

    export const enum KeyboardModifiers { // uint8_t
        LeftControl = 0xe0,
        LeftShift = 0xe1,
        LeftAlt = 0xe2,
        LeftGUID = 0xe3,
        RightControl = 0xe4,
        RightShift = 0xe5,
        RightAlt = 0xe6,
        RightGUID = 0xe7,
    }


    export const enum KeyboardAction { // uint8_t
        Press = 0x0,
        Up = 0x1,
        Down = 0x2,
    }

    export const enum KeyboardCmd {
        /**
         * Presses a key or a sequence of keys down.
         *
         * ```
         * const [rest] = jdunpack<[([number, KeyboardModifiers, KeyboardAction])[]]>(buf, "r: u16 u8 u8")
         * const [selector, modifiers, action] = rest[0]
         * ```
         */
        Key = 0x80,

        /**
         * No args. Clears all pressed keys.
         */
        Clear = 0x81,
    }

}

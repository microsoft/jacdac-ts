namespace jacdac {
    // Service: Gamepad
    export const SRV_GAMEPAD = 0x1deaa06e

    export const enum GamepadButton { // uint16_t
        Left = 0x1,
        Up = 0x2,
        Right = 0x3,
        Down = 0x4,
        A = 0x5,
        B = 0x6,
        Menu = 0x7,
        MenuAlt = 0x8,
        Reset = 0x9,
        Exit = 0xa,
    }

    export const enum GamepadCmd {
        /**
         * No args. Indicates number of players supported and which buttons are present on the controller.
         */
        Announce = 0x0,

        /**
         * report Announce
         * ```
         * const [flags, numPlayers, buttonPresent] = jdunpack<[number, number, GamepadButton[]]>(buf, "u8 u8 u16[]")
         * ```
         */
    }

    export const enum GamepadReg {
        /**
         * Indicates which buttons are currently active (pressed).
         * `pressure` should be `0xff` for digital buttons, and proportional for analog ones.
         *
         * ```
         * const [rest] = jdunpack<[([GamepadButton, number, number])[]]>(buf, "r: u16 u8 u8")
         * const [button, playerIndex, pressure] = rest[0]
         * ```
         */
        Buttons = 0x101,
    }

    export const enum GamepadEvent {
        /**
         * Emitted when button goes from inactive to active.
         *
         * ```
         * const [button, playerIndex] = jdunpack<[GamepadButton, number]>(buf, "u16 u16")
         * ```
         */
        //% block="down"
        Down = 0x1,

        /**
         * Emitted when button goes from active to inactive.
         *
         * ```
         * const [button, playerIndex] = jdunpack<[GamepadButton, number]>(buf, "u16 u16")
         * ```
         */
        //% block="up"
        Up = 0x2,
    }

}

namespace jacdac {
    // Service: Button
    export const SRV_BUTTON = 0x1473a263
    export const enum ButtonReg {
        /**
         * Read-only bool (uint8_t). Indicates whether the button is currently active (pressed).
         *
         * ```
         * const [pressed] = jdunpack<[number]>(buf, "u8")
         * ```
         */
        Pressed = 0x101,
    }

    export const enum ButtonEvent {
        /**
         * Emitted when button goes from inactive (`pressed == 0`) to active.
         */
        //% block="down"
        Down = 0x1,

        /**
         * Argument: time ms uint32_t. Emitted when button goes from active (`pressed == 1`) to inactive. The 'time' parameter
         * records the amount of time between the down and up events.
         *
         * ```
         * const [time] = jdunpack<[number]>(buf, "u32")
         * ```
         */
        //% block="up"
        Up = 0x2,

        /**
         * Argument: time ms uint32_t. Emitted when the press time is greater than 500ms, and then at least every 500ms
         * as long as the button remains pressed. The 'time' parameter records the the amount of time
         * that the button has been held (since the down event).
         *
         * ```
         * const [time] = jdunpack<[number]>(buf, "u32")
         * ```
         */
        //% block="hold"
        Hold = 0x81,
    }

}

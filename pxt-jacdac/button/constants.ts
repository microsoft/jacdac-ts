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

        /**
         * Read-write uint32_t. Threshold for `click` and `hold` events (see event descriptions below).
         *
         * ```
         * const [clickHoldTime] = jdunpack<[number]>(buf, "u32")
         * ```
         */
        ClickHoldTime = 0x80,
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
         * Emitted together with `up` when the press time less than or equal to `click_hold_time`.
         */
        //% block="click"
        Click = 0x80,

        /**
         * Emitted when the press times is greater than `click_hold_time`. Hold events are followed by a separate up event.
         */
        //% block="hold"
        Hold = 0x81,
    }

}

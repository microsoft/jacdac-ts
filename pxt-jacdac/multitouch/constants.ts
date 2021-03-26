namespace jacdac {
    // Service: Multitouch
    export const SRV_MULTITOUCH = 0x18d55e2b
    export const enum MultitouchReg {
        /**
         * Read-only. Capacitance of channels. The capacitance is continuously calibrated, and a value of `0` indicates
         * no touch, wheres a value of around `100` or more indicates touch.
         * It's best to ignore this (unless debugging), and use events.
         *
         * ```
         * const [capacitance] = jdunpack<[number[]]>(buf, "i32[]")
         * ```
         */
        Capacity = 0x101,
    }

    export const enum MultitouchEvent {
        /**
         * Argument: channel uint32_t. Emitted when an input is touched.
         *
         * ```
         * const [channel] = jdunpack<[number]>(buf, "u32")
         * ```
         */
        //% block="touch"
        Touch = 0x1,

        /**
         * Argument: channel uint32_t. Emitted when an input is no longer touched.
         *
         * ```
         * const [channel] = jdunpack<[number]>(buf, "u32")
         * ```
         */
        //% block="release"
        Release = 0x2,

        /**
         * Argument: channel uint32_t. Emitted when an input is briefly touched. TODO Not implemented.
         *
         * ```
         * const [channel] = jdunpack<[number]>(buf, "u32")
         * ```
         */
        //% block="tap"
        Tap = 0x80,

        /**
         * Argument: channel uint32_t. Emitted when an input is touched for longer than 500ms. TODO Not implemented.
         *
         * ```
         * const [channel] = jdunpack<[number]>(buf, "u32")
         * ```
         */
        //% block="long press"
        LongPress = 0x81,

        /**
         * Emitted when input channels are successively touched in order of increasing channel numbers.
         */
        //% block="swipe pos"
        SwipePos = 0x90,

        /**
         * Emitted when input channels are successively touched in order of decreasing channel numbers.
         */
        //% block="swipe neg"
        SwipeNeg = 0x91,
    }

}

namespace jacdac {
    // Service: Analog Button
    export const SRV_ANALOG_BUTTON = 0x1865adc9

    export const enum AnalogButtonVariant { // uint8_t
        Pressure = 0x1,
        Capacitive = 0x2,
    }

    export const enum AnalogButtonReg {
        /**
         * Read-only ratio u0.16 (uint16_t). Indicates the current pressure (``force``) on the button.
         *
         * ```
         * const [pressure] = jdunpack<[number]>(buf, "u0.16")
         * ```
         */
        Pressure = 0x101,

        /**
         * Read-write ratio u0.16 (uint16_t). Indicates the lower threshold for ``inactive`` events.
         *
         * ```
         * const [inactiveThreshold] = jdunpack<[number]>(buf, "u0.16")
         * ```
         */
        InactiveThreshold = 0x5,

        /**
         * Read-write ratio u0.16 (uint16_t). Indicates the threshold for ``active`` events.
         *
         * ```
         * const [activeThreshold] = jdunpack<[number]>(buf, "u0.16")
         * ```
         */
        ActiveThreshold = 0x6,

        /**
         * Constant Variant (uint8_t). The type of physical button.
         *
         * ```
         * const [variant] = jdunpack<[jacdac.AnalogButtonVariant]>(buf, "u8")
         * ```
         */
        Variant = 0x107,
    }

    export const enum AnalogButtonEvent {
        /**
         * Emitted when button goes from inactive (pressure less than threshold) to active.
         */
        //% block="active"
        Active = 0x1,

        /**
         * Emitted when button goes from active (pressure higher than threshold) to inactive.
         */
        //% block="inactive"
        Inactive = 0x2,
    }

}

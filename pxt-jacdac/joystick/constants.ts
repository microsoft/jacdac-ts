namespace jacdac {
    // Service: Joystick
    export const SRV_JOYSTICK = 0x1acb1890

    export const enum JoystickVariant { // uint8_t
        Thumb = 0x1,
        ArcadeBall = 0x2,
        ArcadeStick = 0x3,
    }

    export const enum JoystickReg {
        /**
         * The direction of the joystick measure in two direction.
         * If joystick is digital, then each direction will read as either `-0x8000`, `0x0`, or `0x7fff`.
         *
         * ```
         * const [x, y] = jdunpack<[number, number]>(buf, "i1.15 i1.15")
         * ```
         */
        Direction = 0x101,

        /**
         * Constant Variant (uint8_t). The type of physical joystick.
         *
         * ```
         * const [variant] = jdunpack<[jacdac.JoystickVariant]>(buf, "u8")
         * ```
         */
        Variant = 0x107,

        /**
         * Constant bool (uint8_t). Indicates if the joystick is digital, typically made of switches.
         *
         * ```
         * const [digital] = jdunpack<[number]>(buf, "u8")
         * ```
         */
        Digital = 0x180,
    }

}

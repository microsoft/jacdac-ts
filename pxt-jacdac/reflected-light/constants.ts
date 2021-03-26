namespace jacdac {
    // Service: Reflected light
    export const SRV_REFLECTED_LIGHT = 0x126c4cb2

    export const enum ReflectedLightVariant { // uint8_t
        InfraredDigital = 0x1,
        InfraredAnalog = 0x2,
    }

    export const enum ReflectedLightReg {
        /**
         * Read-only ratio u0.16 (uint16_t). Reports the reflected brightness. It may be a digital value or, for some sensor, analog value.
         *
         * ```
         * const [brightness] = jdunpack<[number]>(buf, "u0.16")
         * ```
         */
        Brightness = 0x101,

        /**
         * Constant Variant (uint8_t). Type of physical sensor used
         *
         * ```
         * const [variant] = jdunpack<[jacdac.ReflectedLightVariant]>(buf, "u8")
         * ```
         */
        Variant = 0x107,
    }

    export const enum ReflectedLightEvent {
        /**
         * The sensor detected a transition from light to dark
         */
        //% block="dark"
        Dark = 0x2,

        /**
         * The sensor detected a transition from dark to light
         */
        //% block="light"
        Light = 0x1,
    }

}

namespace jacdac {
    // Service: Light level
    export const SRV_LIGHT_LEVEL = 0x17dc9a1c

    export const enum LightLevelVariant { // uint8_t
        PhotoResistor = 0x1,
        LEDMatrix = 0x2,
        Ambient = 0x3,
    }

    export const enum LightLevelReg {
        /**
         * Read-only ratio u0.16 (uint16_t). Detect light level
         *
         * ```
         * const [lightLevel] = jdunpack<[number]>(buf, "u0.16")
         * ```
         */
        LightLevel = 0x101,

        /**
         * Constant Variant (uint8_t). The type of physical sensor.
         *
         * ```
         * const [variant] = jdunpack<[jacdac.LightLevelVariant]>(buf, "u8")
         * ```
         */
        Variant = 0x107,
    }

}

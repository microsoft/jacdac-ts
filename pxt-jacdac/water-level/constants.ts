namespace jacdac {
    // Service: Water level
    export const SRV_WATER_LEVEL = 0x147b62ed

    export const enum WaterLevelVariant { // uint8_t
        Resistive = 0x1,
        ContactPhotoElectric = 0x2,
        NonContactPhotoElectric = 0x3,
    }

    export const enum WaterLevelReg {
        /**
         * Read-only ratio u0.16 (uint16_t). The reported water level.
         *
         * ```
         * const [level] = jdunpack<[number]>(buf, "u0.16")
         * ```
         */
        Level = 0x101,

        /**
         * Constant Variant (uint8_t). The type of physical sensor.
         *
         * ```
         * const [variant] = jdunpack<[jacdac.WaterLevelVariant]>(buf, "u8")
         * ```
         */
        Variant = 0x107,
    }

}

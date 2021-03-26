namespace jacdac {
    // Service: Sound Sensor
    export const enum SoundSensorReg {
        /**
         * Read-write bool (uint8_t). Turns on/off the micropohone.
         *
         * ```
         * const [enabled] = jdunpack<[number]>(buf, "u8")
         * ```
         */
        Enabled = 0x1,

        /**
         * Read-write dB int16_t. The minimum power value considered by the sensor.
         *
         * ```
         * const [minDecibels] = jdunpack<[number]>(buf, "i16")
         * ```
         */
        MinDecibels = 0x81,

        /**
         * Read-write dB int16_t. The maximum power value considered by the sensor.
         *
         * ```
         * const [maxDecibels] = jdunpack<[number]>(buf, "i16")
         * ```
         */
        MaxDecibels = 0x82,
    }

}

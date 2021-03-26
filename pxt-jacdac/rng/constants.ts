namespace jacdac {
    // Service: Random Number Generator
    export const SRV_RNG = 0x1789f0a2

    export const enum RngVariant { // uint8_t
        Quantum = 0x1,
        ADCNoise = 0x2,
        WebCrypto = 0x3,
    }

    export const enum RngReg {
        /**
         * Read-only bytes. A register that returns a 64 bytes random buffer on every request.
         * This never blocks for a long time. If you need additional random bytes, keep querying the register.
         *
         * ```
         * const [random] = jdunpack<[Buffer]>(buf, "b")
         * ```
         */
        Random = 0x180,

        /**
         * Constant Variant (uint8_t). The type of algorithm/technique used to generate the number.
         * `Quantum` refers to dedicated hardware device generating random noise due to quantum effects.
         * `ADCNoise` is the noise from quick readings of analog-digital converter, which reads temperature of the MCU or some floating pin.
         * `WebCrypto` refers is used in simulators, where the source of randomness comes from an advanced operating system.
         *
         * ```
         * const [variant] = jdunpack<[jacdac.RngVariant]>(buf, "u8")
         * ```
         */
        Variant = 0x107,
    }

}

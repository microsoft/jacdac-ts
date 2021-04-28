namespace jacdac {
    // Service: Capacitive Button
    export const SRV_CAPACITIVE_BUTTON = 0x2865adc9
    export const enum CapacitiveButtonReg {
        /**
         * Read-write ratio u0.16 (uint16_t). Indicates the threshold for ``up`` events.
         *
         * ```
         * const [threshold] = jdunpack<[number]>(buf, "u0.16")
         * ```
         */
        Threshold = 0x6,
    }

    export const enum CapacitiveButtonCmd {
        /**
         * No args. Request to calibrate the capactive. When calibration is requested, the device expects that no object is touching the button.
         * The report indicates the calibration is done.
         */
        Calibrate = 0x2,
    }

}

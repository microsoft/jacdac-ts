namespace servers {
    // Service: Thermometer
    const SRV_THERMOMETER = 0x1421bac7

    const enum ThermometerVariant { // uint8_t
        Outdoor = 0x1,
        Indoor = 0x2,
        Body = 0x3,
    }

    const enum ThermometerReg {
        /**
         * Read-only °C i22.10 (int32_t). The temperature.
         *
         * ```
         * const [temperature] = jdunpack<[number]>(buf, "i22.10")
         * ```
         */
        Temperature = 0x101,

        /**
         * Constant °C i22.10 (int32_t). Lowest temperature that can be reported.
         *
         * ```
         * const [minTemperature] = jdunpack<[number]>(buf, "i22.10")
         * ```
         */
        MinTemperature = 0x104,

        /**
         * Constant °C i22.10 (int32_t). Highest temperature that can be reported.
         *
         * ```
         * const [maxTemperature] = jdunpack<[number]>(buf, "i22.10")
         * ```
         */
        MaxTemperature = 0x105,

        /**
         * Read-only °C u22.10 (uint32_t). The real temperature is between `temperature - temperature_error` and `temperature + temperature_error`.
         *
         * ```
         * const [temperatureError] = jdunpack<[number]>(buf, "u22.10")
         * ```
         */
        TemperatureError = 0x106,

        /**
         * Constant Variant (uint8_t). Specifies the type of thermometer.
         *
         * ```
         * const [variant] = jdunpack<[jacdac.ThermometerVariant]>(buf, "u8")
         * ```
         */
        Variant = 0x107,
    }

    export class ThermometerServer extends jacdac.SensorServer {
        variant: ThermometerVariant = ThermometerVariant.Indoor;

        constructor() {
            super("thermometer", SRV_THERMOMETER)
        }

        public handlePacket(pkt: jacdac.JDPacket) {
            super.handlePacket(pkt)
            this.handleRegValue(pkt, ThermometerReg.MinTemperature, "i22.10", -10);
            this.handleRegValue(pkt, ThermometerReg.MaxTemperature, "i22.10", 50);
            this.handleRegValue(pkt, ThermometerReg.TemperatureError, "u22.10", 3);
            this.handleRegValue(pkt, ThermometerReg.Variant, "u8", this.variant)
        }

        public serializeState(): Buffer {
            return jacdac.jdpack("i22.10", [input.temperature()]);
        }
    }

    //% fixedInstance whenUsed block="thermometer"
    export const thermometerServer = new ThermometerServer()
}
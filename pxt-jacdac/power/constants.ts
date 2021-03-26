namespace jacdac {
    // Service: Power
    export const SRV_POWER = 0x1fa4c95a
    export const enum PowerReg {
        /**
         * Read-write bool (uint8_t). Turn the power to the bus on/off.
         *
         * ```
         * const [enabled] = jdunpack<[number]>(buf, "u8")
         * ```
         */
        Enabled = 0x1,

        /**
         * Read-write mA uint16_t. Limit the power provided by the service. The actual maximum limit will depend on hardware.
         * This field may be read-only in some implementations - you should read it back after setting.
         *
         * ```
         * const [maxPower] = jdunpack<[number]>(buf, "u16")
         * ```
         */
        MaxPower = 0x7,

        /**
         * Read-only bool (uint8_t). Indicates whether the power has been shut down due to overdraw.
         *
         * ```
         * const [overload] = jdunpack<[number]>(buf, "u8")
         * ```
         */
        Overload = 0x181,

        /**
         * Read-only mA uint16_t. Present current draw from the bus.
         *
         * ```
         * const [currentDraw] = jdunpack<[number]>(buf, "u16")
         * ```
         */
        CurrentDraw = 0x101,

        /**
         * Read-only mV uint16_t. Voltage on input.
         *
         * ```
         * const [batteryVoltage] = jdunpack<[number]>(buf, "u16")
         * ```
         */
        BatteryVoltage = 0x180,

        /**
         * Read-only ratio u0.16 (uint16_t). Fraction of charge in the battery.
         *
         * ```
         * const [batteryCharge] = jdunpack<[number]>(buf, "u0.16")
         * ```
         */
        BatteryCharge = 0x182,

        /**
         * Constant mWh uint32_t. Energy that can be delivered to the bus when battery is fully charged.
         * This excludes conversion overheads if any.
         *
         * ```
         * const [batteryCapacity] = jdunpack<[number]>(buf, "u32")
         * ```
         */
        BatteryCapacity = 0x183,

        /**
         * Read-write ms uint16_t. Many USB power packs need current to be drawn from time to time to prevent shutdown.
         * This regulates how often and for how long such current is drawn.
         * Typically a 1/8W 22 ohm resistor is used as load. This limits the duty cycle to 10%.
         *
         * ```
         * const [keepOnPulseDuration] = jdunpack<[number]>(buf, "u16")
         * ```
         */
        KeepOnPulseDuration = 0x80,

        /**
         * Read-write ms uint16_t. Many USB power packs need current to be drawn from time to time to prevent shutdown.
         * This regulates how often and for how long such current is drawn.
         * Typically a 1/8W 22 ohm resistor is used as load. This limits the duty cycle to 10%.
         *
         * ```
         * const [keepOnPulsePeriod] = jdunpack<[number]>(buf, "u16")
         * ```
         */
        KeepOnPulsePeriod = 0x81,

        /**
         * Read-write int32_t. This value is added to `priority` of `active` reports, thus modifying amount of load-sharing
         * between different supplies.
         * The `priority` is clamped to `u32` range when included in `active` reports.
         *
         * ```
         * const [priorityOffset] = jdunpack<[number]>(buf, "i32")
         * ```
         */
        PriorityOffset = 0x82,
    }

    export const enum PowerCmd {
        /**
         * Argument: priority uint32_t. Emitted with announce packets when the service is running.
         * The `priority` should be computed as
         * `(((max_power >> 5) << 24) | remaining_capacity) + priority_offset`
         * where the `remaining_capacity` is `(battery_charge * battery_capacity) >> 16`,
         * or one of the special constants
         * `0xe00000` when the remaining capacity is unknown,
         * or `0xf00000` when the capacity is considered infinite (eg., wall charger).
         * The `priority` is clamped to `u32` range after computation.
         * In cases where battery capacity is unknown but the charge percentage can be estimated,
         * it's recommended to assume a fixed (typical) battery capacity for priority purposes,
         * rather than using `0xe00000`, as this will have a better load-sharing characteristic,
         * especially if several power providers of the same type are used.
         *
         * ```
         * const [priority] = jdunpack<[number]>(buf, "u32")
         * ```
         */
        Active = 0x80,
    }

}

/**
 * 
 * A partial TypeScript support for SenML (https://www.iana.org/assignments/senml/senml.xhtml)
 * 
 */

import { SMap } from "./utils";

export const MIME_TYPE = "application/senml+json";

export type SenMLUnit = "m" | "kg" | "g" | "s" | "A" | "K" | "cd" | "mol" | "Hz" | "rad" | "sr" | "N" | "Pa" | "J" | "W" | "C" | "V" | "F" | "Ohm"
    | "S" | "Wb" | "T" | "H" | "Cel" | "lm" | "lx" | "Bq" | "Gy" | "Sv" | "kat" | "m2" | "m3" | "l" | "m/s" | "m/s2" | "m3/s" | "l/s"
    | "W/m2" | "cd/m2" | "bit" | "bit/s" | "lat" | "lon" | "pH" | "dB" | "dBW" | "Bspl" | "count" | "/" | "%" | "%RH" | "%EL" | "EL"
    | "1/s" | "1/min" | "beat/min" | "beats" | "S/m" | "B" | "VA" | "VAs" | "var" | "vars" | "J/m" | "kg/m3" | "deg";

export const SenMLUnitDescription: SMap<string> = {
    "m": "meter",
    "kg": "kilogram",
    "g": "gram*",
    "s": "second",
    "A": "ampere",
    "K": "kelvin",
    "cd": "candela",
    "mol": "mole",
    "Hz": "hertz",
    "rad": "radian",
    "sr": "steradian",
    "N": "newton",
    "Pa": "pascal",
    "J": "joule",
    "W": "watt",
    "C": "coulomb",
    "V": "volt",
    "F": "farad",
    "Ohm": "ohm",
    "S": "siemens",
    "Wb": "weber",
    "T": "tesla",
    "H": "henry",
    "Cel": "degrees Celsius",
    "lm": "lumen",
    "lx": "lux",
    "Bq": "becquerel",
    "Gy": "gray",
    "Sv": "sievert",
    "kat": "katal",
    "m2": "square meter (area)",
    "m3": "cubic meter (volume)",
    "l": "liter (volume)*",
    "m/s": "meter per second (velocity)",
    "m/s2": "meter per square second (acceleration)",
    "m3/s": "cubic meter per second (flow rate)",
    "l/s": "liter per second (flow rate)*",
    "W/m2": "watt per square meter (irradiance)",
    "cd/m2": "candela per square meter (luminance)",
    "bit": "bit (information content)",
    "bit/s": "bit per second (data rate)",
    "lat": "degrees latitude[1]",
    "lon": "degrees longitude[1]",
    "pH": "pH value (acidity; logarithmic quantity)",
    "dB": "decibel (logarithmic quantity)",
    "dBW": "decibel relative to 1 W (power level)",
    "Bspl": "bel (sound pressure level; logarithmic quantity)*",
    "count": "1 (counter value)",
    "/": "1 (ratio e.g., value of a switch; [2])",
    "%": "1 (ratio e.g., value of a switch; [2])*",
    "%RH": "Percentage (Relative Humidity)",
    "%EL": "Percentage (remaining battery energy level)",
    "EL": "seconds (remaining battery energy level)",
    "1/s": "1 per second (event rate)",
    "1/min": "1 per minute (event rate, 'rpm')*",
    "beat/min": "1 per minute (heart rate in beats per minute)*",
    "beats": "1 (Cumulative number of heart beats)*",
    "S/m": "Siemens per meter (conductivity)",
    "B": "Byte (information content)",
    "VA": "volt-ampere (Apparent Power)",
    "VAs": "volt-ampere second (Apparent Energy)",
    "var": "volt-ampere reactive (Reactive Power)",
    "vars": "volt-ampere-reactive second (Reactive Energy)",
    "J/m": "joule per meter (Energy per distance)",
    "kg/m3": "kilogram per cubic meter (mass density, mass concentration)",
    "deg": "degree (angle)*"
}

// https://tools.ietf.org/html/rfc8798
export type SenMLSecondaryUnit = "ms" | "min" | "h" | "MHz" | "kW" | "kVA" | "kvar" | "Ah" | "Wh" | "kWh"
    | "varh" | "kvarh" | "kVAh" | "Wh/km" | "KiB" | "GB" | "Mbit/s" | "B/s" | "MB/s" | "mV" | "mA" | "dBm" | "ug/m3"
    | "mm/h" | "m/h" | "ppm" | "/100" | "/1000" | "hPa" | "mm" | "cm" | "km" | "km/h";

export const SenMLSecondaryUnitConverters: SMap<{
    name: string;
    unit: SenMLUnit | "";
    scale: number;
    offset: number;
}> = {
    "ms": { name: "millisecond", unit: "s", scale: 1 / 1000, offset: 0 },
    "min": { name: "minute", unit: "s", scale: 60, offset: 0 },
    "h": { name: "hour", unit: "s", scale: 3600, offset: 0 },
    "MHz": { name: "megahertz", unit: "Hz", scale: 1000000, offset: 0 },
    "kW": { name: "kilowatt", unit: "W", scale: 1000, offset: 0 },
    "kVA": { name: "kilovolt-ampere", unit: "VA", scale: 1000, offset: 0 },
    "kvar": { name: "kilovar", unit: "var", scale: 1000, offset: 0 },
    "Ah": { name: "ampere-hour", unit: "C", scale: 3600, offset: 0 },
    "Wh": { name: "watt-hour", unit: "J", scale: 3600, offset: 0 },
    "kWh": { name: "kilowatt-hour", unit: "J", scale: 3600000, offset: 0 },
    "varh": { name: "var-hour", unit: "vars", scale: 3600, offset: 0 },
    "kvarh": { name: "kilovar-hour", unit: "vars", scale: 3600000, offset: 0 },
    "kVAh": { name: "kilovolt-ampere-hour", unit: "VAs", scale: 3600000, offset: 0 },
    "Wh/km": { name: "watt-hour per kilometer", unit: "J/m", scale: 3.6, offset: 0 },
    "KiB": { name: "kibibyte", unit: "B", scale: 1024, offset: 0 },
    "GB": { name: "gigabyte", unit: "B", scale: 1.00E+09, offset: 0 },
    "Mbit/s": { name: "megabit per second", unit: "bit/s", scale: 1000000, offset: 0 },
    "B/s": { name: "byte per second", unit: "bit/s", scale: 8, offset: 0 },
    "MB/s": { name: "megabyte per second", unit: "bit/s", scale: 8000000, offset: 0 },
    "mV": { name: "millivolt", unit: "V", scale: 1 / 1000, offset: 0 },
    "mA": { name: "milliampere", unit: "A", scale: 1 / 1000, offset: 0 },
    "dBm": { name: "decibel (milliwatt)", unit: "dBW", scale: 1, offset: -30 },
    "ug/m3": { name: "microgram per cubic meter", unit: "kg/m3", scale: 1.00E-09, offset: 0 },
    "mm/h": { name: "millimeter per hour", unit: "m/s", scale: 1 / 3600000, offset: 0 },
    "m/h": { name: "meter per hour", unit: "m/s", scale: 1 / 3600, offset: 0 },
    "ppm": { name: "parts per million", unit: "/", scale: 1.00E-06, offset: 0 },
    "/100": { name: "percent", unit: "/", scale: 1 / 100, offset: 0 },
    "/1000": { name: "permille", unit: "/", scale: 1 / 1000, offset: 0 },
    "hPa": { name: "hectopascal", unit: "Pa", scale: 100, offset: 0 },
    "mm": { name: "millimeter", unit: "m", scale: 1 / 1000, offset: 0 },
    "cm": { name: "centimeter", unit: "m", scale: 1 / 100, offset: 0 },
    "km": { name: "kilometer", unit: "m", scale: 1000, offset: 0 },
    "km/h": { name: "kilometer per hour", unit: "m/s", scale: 1 / 3.6, offset: 0 },

    // compat with previous JACDAC versions
    "": { name: "count", unit: "", scale: 1, offset: 0 },
    "frac": { name: "ratio", unit: "/", scale: 1, offset: 0 },
    "us": { name: "micro seconds", unit: "s", scale: 1e-6, offset: 0 },
    "mWh": { name: "micro watt-hour", unit: "J", scale: 3.6e-3, offset: 0 },
    "grav": { name: "earth gravity", unit: "m/s2", scale: 9.80665, offset: 0 }
}

export interface SenMLRecord {
    // Base Name
    bn?: string;
    // Base Time
    bt?: number;
    // Base Unit
    bu?: SenMLUnit | SenMLSecondaryUnit;
    // Base Value
    bv?: number;
    // Base Sum
    bs?: number;
    // Base Version
    bver?: number;

    // Name
    n?: string;
    // Unit
    u?: SenMLUnit | SenMLSecondaryUnit;
    // Value
    v?: number;
    // String value
    vs?: string;
    // Boolean value
    vb?: boolean;
    // Data value (base64)
    vd?: string;
    // Sum
    s?: number;
    // Time (omit for "now")
    t?: number;
    // Update time
    ut?: number;
}

export type SenMLPack = SenMLRecord[];

/**
 * Rescales seconary unit to primary unit
 * @param value 
 * @param unit 
 */
export function normalizeUnit(value: number, unit: string) {
    // seconary unit?
    const su = unit && SenMLSecondaryUnitConverters[unit];
    if (su)
        return {
            value: (value * su.scale) + su.offset,
            name: su.name,
            unit: su.unit,
        }

    // primary?
    const name = unit && SenMLUnitDescription[unit];

    // no scaling
    return { value, unit, name };
}
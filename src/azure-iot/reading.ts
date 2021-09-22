import { PackedValues } from "../jacdac"

/**
 * service reading and register state
 */
export type EncodedServiceReading = {
    registers?: Record<string, PackedValues>
    readings?: number[]
    timedelta?: number[]
}

/**
 * service indexed name -> readings
 */
export type EncodedDeviceReading = Record<string, EncodedServiceReading>

/**
 * {device short id}_{device id} --> service readings
 */
export type EncodedBusReading = Record<string, EncodedDeviceReading>

/**
 * bus readings
 */
export type EncodedSensorReading = {
    readings: EncodedBusReading
    deviceTime: number
}

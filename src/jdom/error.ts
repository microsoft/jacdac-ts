import { ERROR_TRANSPORT_DEVICE_LOCKED, JACDAC_ERROR } from "./constants"

/**
 * Common Jacdac error type
 * @category Runtime
 */
export class JDError extends Error {
    constructor(message: string, readonly jacdacName?: string) {
        super(message)
        this.name = JACDAC_ERROR
    }
}
export default JDError

/**
 * Extract the Jacdac error code if any
 * @param e
 * @returns
 * @category Runtime
 */
export function errorCode(e: Error): string {
    const jacdacCode =
        e.name === JACDAC_ERROR ? (e as JDError)?.jacdacName : undefined
    if (jacdacCode) return jacdacCode

    const deviceLocked =
        e.name == "NetworkError" && /unable to claim interface/i.test(e.message)
    if (deviceLocked) return ERROR_TRANSPORT_DEVICE_LOCKED

    return undefined
}

import {
    ERROR_NO_ACK,
    ERROR_TIMEOUT,
    ERROR_TRANSPORT_DEVICE_LOCKED,
    JACDAC_ERROR,
} from "./constants"

export interface JDErrorOptions {
    /**
     * The error code
     */
    code?: string
    /**
     * If true, the error is not reported to the user
     */
    cancel?: boolean
}
/**
 * Common Jacdac error type
 * @category Runtime
 */
export class JDError extends Error {
    readonly code: string
    readonly cancel: boolean
    constructor(message: string, options?: JDErrorOptions) {
        super(message)
        this.name = JACDAC_ERROR
        this.code = options?.code
        this.cancel = !!options?.cancel
    }
}

export function throwError(msg: string, options?: JDErrorOptions) {
    const e = new JDError(msg, options)
    throw e
}

export function isCancelError(e: Error) {
    const res = e?.name === JACDAC_ERROR ? (e as JDError)?.cancel : false
    return res
}

export function isAckError(e: Error) {
    return isCodeError(e, ERROR_NO_ACK)
}

export function isTimeoutError(e: Error) {
    return isCodeError(e, ERROR_TIMEOUT)
}

export function isCodeError(e: Error, code: string) {
    return errorCode(e) === code
}

/**
 * Extract the Jacdac error code if any
 * @param e
 * @returns
 * @category Runtime
 */
export function errorCode(e: Error): string {
    const code = e?.name === JACDAC_ERROR ? (e as JDError)?.code : undefined
    if (code) return code

    const deviceLocked =
        e.name == "NetworkError" && /unable to claim interface/i.test(e.message)
    if (deviceLocked) return ERROR_TRANSPORT_DEVICE_LOCKED

    return undefined
}

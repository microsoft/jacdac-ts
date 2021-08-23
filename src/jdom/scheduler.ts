/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * A time scheduler to orchestrate time in the bus.
 */
export interface Scheduler {
    /**
     * Gets the current timestamp
     */
    get timestamp(): number
    /**
     * Reset time
     * @param delta
     */
    resetTime(delta: number): void
    /**
     * Start a timeout timer
     */
    setTimeout(
        handler: (...args: any[]) => void,
        delay: number,
        ...args: any[]
    ): any
    /**
     * Cancel an existing timeout timer
     */
    clearTimeout(handle: any): void
    /**
     * Start an interval timer
     */
    setInterval(
        handler: (...args: any[]) => void,
        delay: number,
        ...args: any[]
    ): any
    /**
     * Clear an interval timer
     */
    clearInterval(handle: any): void
}

/** @internal */
export class WallClockScheduler implements Scheduler {
    private _now: () => number
    private _startTime: number

    constructor() {
        this._now =
            typeof performance !== "undefined"
                ? () => performance.now()
                : () => Date.now()
        this._startTime = this._now()
    }

    get timestamp(): number {
        return this._now() - this._startTime
    }
    resetTime(delta = 0) {
        this._startTime = this._now() - delta
    }
    setTimeout(
        handler: (...args: any[]) => void,
        delay: number,
        ...args: any[]
    ): any {
        return setTimeout(handler, delay, args)
    }
    clearTimeout(handle: any): void {
        clearTimeout(handle)
    }
    setInterval(
        handler: (...args: any[]) => void,
        delay: number,
        ...args: any[]
    ): any {
        return setInterval(handler, delay, args)
    }
    clearInterval(handle: any): void {
        clearInterval(handle)
    }
}

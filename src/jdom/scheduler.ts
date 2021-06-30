/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Scheduler {
    get timestamp(): number
    resetTime(delta: number): void
    setTimeout(
        handler: (...args: any[]) => void,
        delay: number,
        ...args: any[]
    ): any
    clearTimeout(handle: any): void
    setInterval(
        handler: (...args: any[]) => void,
        delay: number,
        ...args: any[]
    ): any
    clearInterval(handle: any): void
}

export class WallClockScheduler implements Scheduler {
    private _startTime: number

    constructor() {
        this._startTime = performance.now()
    }

    get timestamp(): number {
        return performance.now() - this._startTime
    }
    resetTime(delta = 0) {
        this._startTime = performance.now() - delta
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

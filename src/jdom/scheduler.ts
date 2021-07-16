import { assert } from "./jacdac-jdom"

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

interface IntervalDefinition {
    nextTime: number
    interval: number
}


export class FastForwardScheduler implements Scheduler {
    protected currentTime = 0
    protected maxTime = 0

    protected intervalMap = new Map<(...args: any[]) => void, IntervalDefinition>()
    protected timeoutMap = new Map<(...args: any[]) => void, number>()  // time when it expires

    // TODO this API needs some serious thought
    public async stepTo(until: number) {
        this.maxTime = until
        let nextTime = this.maxTime  // TODO this logic or naming needs serious TLC

        console.log(`scheduler: stepTo ${until}`)
        while (nextTime <= this.maxTime) {
            console.log(`scheduler: iterate at t=${this.currentTime} next=${nextTime} ? ${this.maxTime}`)
            // Find the next time where there's a handler pending (can be now)
            // this is a bad algorithm and I feel bad about it
            // TODO use a priority queue or some other non-braindead data structure that isn't O(n)
            nextTime = Number.POSITIVE_INFINITY
            let earliestHandler: (...args: any[]) => void
            let earliestIsTimeout  // TODO replace w/ unified stack

            this.timeoutMap.forEach((value, key) => {
                if (value < nextTime) {
                    nextTime = value
                    earliestHandler = key
                    earliestIsTimeout = true
                }
            })
            this.intervalMap.forEach((value, key) => {
                if (value.nextTime < nextTime) {
                    nextTime = value.nextTime
                    earliestHandler = key
                    earliestIsTimeout = false
                }
            })

            // Run that handler and advance time
            if (earliestHandler !== undefined) {
                console.log(`scheduler: handler at ${nextTime}`)
                this.currentTime = nextTime
                earliestHandler()

                if (earliestIsTimeout) {
                    this.timeoutMap.delete(earliestHandler)
                } else {
                    const intervalDef = this.intervalMap.get(earliestHandler)
                    this.intervalMap.set(earliestHandler, {
                        nextTime: this.currentTime + intervalDef.interval,
                         interval: intervalDef.interval
                        })
                }
            } else { // advance current time to limit
                console.log(`scheduler: max to ${until}`)
                this.currentTime = until
            }
        }

    }

    get timestamp(): number {
        return this.currentTime
    }

    public resetTime(delta: number): void {
        // TODO semantics for rewinding time and setTimeout / setInterval
        throw Error("can't go back in time")
    }

    public setTimeout(
        handler: (...args: any[]) => void,
        delay: number,
        ...args: any[]
    ): any {
        assert(!this.timeoutMap.has(handler), "TODO support duplicate handlers")
        this.timeoutMap.set(handler, this.timestamp + delay)
        return handler
    }

    public clearTimeout(handle: any): void {
        if (this.timeoutMap.has(handle)) {  // TODO should the clear-on-nonexistent policy be silent drop?
            this.timeoutMap.delete(handle)
        }
    }

    public setInterval(
        handler: (...args: any[]) => void,
        delay: number,
        ...args: any[]
    ): any {
        assert(!this.intervalMap.has(handler), "TODO support duplicate handlers")
        this.intervalMap.set(handler, {nextTime: this.timestamp + delay, interval: delay})
        return handler
    }

    public clearInterval(handle: any): void {
        if (this.intervalMap.has(handle)) {  // TODO should the clear-on-nonexistent policy be silent drop?
            this.intervalMap.delete(handle)
        }
    }
}

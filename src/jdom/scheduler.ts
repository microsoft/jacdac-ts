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

interface EventRecord {
    callback: (...args: any[]) => void
    callbackArgs: any[]
    startTime: number
    interval?: number  // how often this event recurs, or undefined for non-recurring

}


export class FastForwardScheduler implements Scheduler {
    protected currentTime = 0

    // TODO unified priority queue, and use a priority queue to be more efficient
    protected intervalMap = new Map<(...args: any[]) => void, IntervalDefinition>()
    protected timeoutMap = new Map<(...args: any[]) => void, number>()  // time when it expires

    // External callbacks, as map from condition (function) to callback (function).
    // The scheduler checks conditions during each time step, and when conditions are met,
    // fires the callback (blocking).
    // The scheduler only runs and advances time when there are external callbacks.
    protected externalCallbacksMap = new Map<() => boolean, () => Promise<void>>()

    // Runs the scheduler until (at least) some condition is met, resolving the promise on the timestep
    // afterward.
    public async runToPromise<T>(promise: Promise<T>): Promise<T> {
        // TODO do we need some mutex to prevent this from being called from multiple places?
        let done = false
        let value: T
        promise.then((arg) => { 
            value = arg
            done = true 
        })

        while (!done) {
            // Find the next time where there's a handler pending (can be now)
            // this is a bad algorithm and I feel bad about it
            // TODO use a priority queue or some other non-braindead data structure that isn't O(n)

            const thisCycleRuns = this.tryRunCycle()
            // Let background events run
            // TODO is this needed?
            await new Promise(resolve => setTimeout(resolve, 0))

            assert(!done || thisCycleRuns, `empty scheduler at ${this.currentTime} but done condition not met`)
        }
        
        return value
    }

    // Tries to run a scheduler cycle, returning true if anything ran, or false if there are no simulator
    // events pending.
    // Updates this.currentTime (if needed) and scheduler state.
    // Synchronous, but can't guarantee that interval and timeout callbacks don't put things on the event queue.
    public tryRunCycle(): boolean {
        let earliestTime = Number.POSITIVE_INFINITY
        let earliestHandler: (...args: any[]) => void
        let earliestIsTimeout  // TODO replace w/ unified stack

        // TODO unify interval and single-shot queues
        this.timeoutMap.forEach((value, key) => {
            if (value < earliestTime) {
                earliestTime = value
                earliestHandler = key
                earliestIsTimeout = true
            }
        })
        this.intervalMap.forEach((value, key) => {
            if (value.nextTime < earliestTime) {
                earliestTime = value.nextTime
                earliestHandler = key
                earliestIsTimeout = false
            }
        })

        // Run that handler and advance time
        if (earliestHandler !== undefined) {
            console.log(`scheduler: handler at ${earliestTime}`)
            this.currentTime = earliestTime
            earliestHandler()

            // TODO unify interval and single-shot queues
            if (earliestIsTimeout) {
                this.timeoutMap.delete(earliestHandler)
            } else {
                const intervalDef = this.intervalMap.get(earliestHandler)
                this.intervalMap.set(earliestHandler, {
                    nextTime: this.currentTime + intervalDef.interval,
                     interval: intervalDef.interval
                })
            }
            return true
        } else { // advance current time to limit
            return false
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

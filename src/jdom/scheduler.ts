import { assert } from "./jacdac-jdom"
import Heap from 'heap-js'

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

interface EventRecord {
    callback: (...args: any[]) => void
    callbackArgs: any[]
    nextTime: number
    interval?: number  // how often this event recurs, or undefined for non-recurring
}

function eventMinComparator(a: EventRecord, b: EventRecord) {
    if (a.nextTime > b.nextTime) {
        return 1
    } else if (a.nextTime < b.nextTime) {
        return -1
    } else {
        return 0
    }
}


export class FastForwardScheduler implements Scheduler {
    protected currentTime = 0

    protected eventQueue = new Heap<EventRecord>(eventMinComparator)

    // Runs the scheduler until (at least) some condition is met, resolving the promise
    // after processing for that instant.
    public async runToPromise<T>(promise: Promise<T>): Promise<T> {
        // TODO do we need some mutex to prevent this from being called from multiple places?
        // TODO these would really be better as status: "wait" | "resolved" | "rejected"
        // but TS doesn't seem to understand the promise.then can run while in the while loop...
        let promiseResolved = false
        let promiseRejected = false
        let value: T
        let rejectedValue: any
        promise.then((fulfilled) => { 
            value = fulfilled
            promiseResolved = true
        }, (rejected) => {
            rejectedValue = rejected
            promiseRejected = true
        })

        while (!promiseResolved) {
            const thisCycleRuns = this.tryRunCycle()

            // Let background events run - including any promise resolutions
            await new Promise(resolve => setTimeout(resolve, 0))

            if (promiseRejected) {
                throw rejectedValue
            }

            assert(!promiseResolved || thisCycleRuns, 
                `empty scheduler at ${this.currentTime} but done condition not met`)
        }

        return value
    }

    // Tries to run a scheduler cycle, returning true if anything ran, or false if there are no simulator
    // events pending.
    // Updates this.currentTime (if needed) and scheduler state.
    // Synchronous, but can't guarantee that interval and timeout callbacks don't put things on the event queue.
    public tryRunCycle(): boolean {
        if (this.eventQueue.isEmpty()) {
            return false
        }

        const nextEvent  = this.eventQueue.pop()
        assert(nextEvent.nextTime >= this.currentTime)

        nextEvent.callback(nextEvent.callbackArgs)
        this.currentTime = nextEvent.nextTime

        if (nextEvent.interval !== undefined) { // for intervals, push a new event
            // update events in-place so handles remain valid
            nextEvent.nextTime += nextEvent.interval
            this.eventQueue.push(nextEvent)
        }

        return true
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
        const eventQueueElt = {
            callback: handler,
            callbackArgs: args,
            nextTime: this.timestamp + delay
        }
        this.eventQueue.push(eventQueueElt)

        return eventQueueElt
    }

    public clearTimeout(handle: any): void {
        this.eventQueue.remove(handle)
    }

    public setInterval(
        handler: (...args: any[]) => void,
        delay: number,
        ...args: any[]
    ): any {
        const eventQueueElt = {
            callback: handler,
            callbackArgs: args,
            nextTime: this.timestamp + delay, 
            interval: delay}
        this.eventQueue.push(eventQueueElt)

        return eventQueueElt
    }

    public clearInterval(handle: any): void {
        this.eventQueue.remove(handle)
    }
}

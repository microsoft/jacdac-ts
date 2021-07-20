import Heap from "heap-js"
import { Scheduler } from "../../src/jdom/scheduler"
import { assert } from "../../src/jdom/utils"

interface EventRecord {
    callback: (...args: any[]) => void
    callbackArgs: any[]
    nextTime: number
    interval?: number // how often this event recurs, or undefined for non-recurring
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

// Fast forward scheduler that is independent of wall time, where time advance is controlled by runToPromise
// but runs as fast as possible within that.
export class FastForwardScheduler implements Scheduler {
    protected currentTime = 0
    protected schedulerRunning = false

    protected eventQueue = new Heap<EventRecord>(eventMinComparator)

    // Runs the scheduler for some duration of simulated time.
    public async runForDelay(delayMs: number) {
        const promise = new Promise(resolve => {
            this.setTimeout(() => {
                resolve(undefined)
            }, delayMs)
        })
        return this.runToPromise(promise)
    }

    // Runs the scheduler until (at least) some condition is met, resolving the promise
    // after processing for that instant.
    // TODO: is this the right API?
    public async runToPromise<T>(promise: Promise<T>): Promise<T> {
        assert(
            !this.schedulerRunning,
            "multiple concurrent run invocations on fast-forward scheduler currently not supported"
        )
        this.schedulerRunning = true

        // TODO these would really be better as status: "wait" | "resolved" | "rejected"
        // but TS doesn't seem to understand the promise.then can run while in the while loop...
        let promiseResolved = false
        let promiseRejected = false
        let value: T
        let rejectedValue: any
        promise.then(
            fulfilled => {
                value = fulfilled
                promiseResolved = true
            },
            rejected => {
                rejectedValue = rejected
                promiseRejected = true
            }
        )

        while (!promiseResolved) {
            // Run the event scheduled for the next event in time
            assert(
                !this.eventQueue.isEmpty(),
                "empty scheduler before promise resolved"
            )
            const nextEvent = this.eventQueue.pop()
            assert(nextEvent.nextTime >= this.currentTime)

            this.currentTime = nextEvent.nextTime
            nextEvent.callback(nextEvent.callbackArgs)

            if (nextEvent.interval !== undefined) {
                // for intervals, push a new event
                // update events in-place so handles remain valid
                nextEvent.nextTime += nextEvent.interval
                this.eventQueue.push(nextEvent)
            }

            // Let background events run - including any promise resolutions
            await new Promise(resolve => setTimeout(resolve, 0))

            if (promiseRejected) {
                this.schedulerRunning = false
                throw rejectedValue
            }
        }

        this.schedulerRunning = false
        return value
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
        const eventQueueElt: EventRecord = {
            callback: handler,
            callbackArgs: args,
            nextTime: this.timestamp + delay,
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
        const eventQueueElt: EventRecord = {
            callback: handler,
            callbackArgs: args,
            nextTime: this.timestamp + delay,
            interval: delay,
        }
        this.eventQueue.push(eventQueueElt)

        return eventQueueElt
    }

    public clearInterval(handle: any): void {
        this.eventQueue.remove(handle)
    }
}

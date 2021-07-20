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

    protected eventQueue = new Heap<EventRecord>(eventMinComparator)

    // Runs the scheduler until (at least) some condition is met, resolving the promise
    // after processing for that instant.
    // TODO: is this the right API?
    public async runToPromise<T>(promise: Promise<T>): Promise<T> {
        // TODO do we need some mutex to prevent this from being called from multiple places?
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

            nextEvent.callback(nextEvent.callbackArgs)
            this.currentTime = nextEvent.nextTime

            if (nextEvent.interval !== undefined) {
                // for intervals, push a new event
                // update events in-place so handles remain valid
                nextEvent.nextTime += nextEvent.interval
                this.eventQueue.push(nextEvent)
            }

            // Let background events run - including any promise resolutions
            await new Promise(resolve => setTimeout(resolve, 0))

            if (promiseRejected) {
                throw rejectedValue
            }
        }

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
        const eventQueueElt = {
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
        const eventQueueElt = {
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

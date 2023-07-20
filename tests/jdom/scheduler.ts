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

// Fast forward scheduler that is independent of wall time, where time advances as long as there is something
// on the task queue but otherwise executes as fast as possible.
export class FastForwardScheduler implements Scheduler {
    protected currentTime = 0
    protected schedulerRunning = false

    // Event queue, for events requested by bus devices, through setTimeout / setInterval
    protected eventQueue = new Heap<EventRecord>(eventMinComparator)

    // Driver queue of promises, where the scheduler continues advancing time as long as this is not empty
    protected driverQueue = new Set()
    protected schedulerDone = false // set to true to terminate the scheduler, which also prevents additional runs

    protected async scheduler() {
        while (!this.schedulerDone) {
            assert(!this.eventQueue.isEmpty(), "empty scheduler")

            if (this.driverQueue.size > 0) {
                // only advance time if there are items on the driver queue
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
            }

            // Note: setTimeout goes on the macrotask queue, so all microtasks (promise resolutions,
            // including chained promises) should be resolved when setTimeout returns.
            await new Promise(resolve => setTimeout(resolve, 0))
        }
    }

    public async start() {
        assert(!this.schedulerDone, "can't restart scheduler")
        assert(
            !this.schedulerRunning,
            "can't have multiple concurrent runs of a scheduler",
        )
        this.schedulerRunning = true

        this.scheduler()
    }

    public async stop() {
        this.schedulerDone = true
    }

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
            this.schedulerRunning,
            "scheduler must be running to advance time",
        )

        this.driverQueue.add(promise)
        promise.then(
            fulfilled => {
                const removed = this.driverQueue.delete(promise)
                assert(
                    removed,
                    "failed to remove fulfilled promise from driver queue",
                )
            },
            rejected => {
                const removed = this.driverQueue.delete(promise)
                assert(
                    removed,
                    "failed to remove rejected promise from driver queue",
                )
            },
        )

        return promise
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

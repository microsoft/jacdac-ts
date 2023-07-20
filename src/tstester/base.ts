// Contains foundational abstractions for the testing system
import { JDBus } from "../jdom/bus"
import { assert } from "../jdom/utils"

// A base class that abstracts away user-facing logging events, eg to pipe it to a web page
export interface ConsoleUi {
    log: (msg: string) => void
}

// ConsoleUi that dumps to the debugging console
export class DebugConsoleUi implements ConsoleUi {
    public log(msg: string) {
        console.log(msg)
    }
}

// TODO separate out some kind of human (tester) interface class? which can have different implementations,
// eg web button or physical Jacdac module button?

export interface HoldingListener {
    holdingPromise: Promise<unknown> // rejects if the holding condition is violated, can only do so after the trigger above
    terminateHold: () => void // called to clean up the holding promise (as a side effect, may also break the trigger)
}

export interface EventWithHold {
    triggerPromise?: Promise<unknown> // resolves when the event triggers
    holdingListener?: HoldingListener // promise that rejects when the condition is violated
    // If both are specified, then holdPromise can only reject after triggerPromise fires.
    // If only holdPromise is specified, it can reject anytime through its termination
}

// Something that can be listened on and represents an instant in time.
// This describes an event, but does not immediately start listening for events.
// Can also include a holding promise, that rejects if conditions are violated
export abstract class TesterEvent {
    public abstract makePromise(): EventWithHold
}

// Base error class that sets its name based on its class,
// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/name
export class TestErrorBase extends Error {
    constructor(message: string) {
        super(message)
        this.name = this.constructor.name
    }
}

// An error that fires when the after/within/tolerance in WaitTimingOptions is not met.
export class WaitTimeoutError extends TestErrorBase {}

export interface WaitTimingOptions {
    after?: number // event must happen at least this many ms after the current time (by default, 0)
    within?: number // event must happen within this many ms after the current time (by default, infinite)
    tolerance?: number // when after is set, sets the allowable range for the event to be tolerance on either side of after
    // is an error if within is set, or after is not set
}

// An error that fires if events are not synchronized within the timing window
export class WaitSynchronizationError extends TestErrorBase {}

export interface SynchronizationTimingOptions extends WaitTimingOptions {
    synchronization?: number // all events must trigger within this time range
}

export interface TestDriverInterface {
    // Waits for an event, with optional timing parameters.
    // Returns the amount of time spent waiting, or throws an error if not within timing bounds.
    waitFor(event: TesterEvent, options?: WaitTimingOptions): Promise<number>

    // Waits for multiple events, with optional timing parameters.
    // All events must fire within the timing window, but with no constarints on order.
    // Returns the amount of time spent waiting to the last event, or throws an error if not within timing bounds.
    waitFor(
        event: TesterEvent[],
        options?: SynchronizationTimingOptions,
    ): Promise<number>
}

export class TestDriver implements TestDriverInterface {
    constructor(
        protected readonly bus: JDBus,
        protected readonly ui: ConsoleUi,
    ) {}

    // TODO should this even exist?
    public log(str: string) {
        this.ui.log(str)
    }

    // Promise wrapper that adds timing conditions.
    // If the input promise resolves in the timing window, its results are returned.
    // Otherwise, a WaitTimeoutError is thrown.
    protected async makePromiseTimed<T>(
        promise: Promise<T>,
        options: WaitTimingOptions,
    ): Promise<T> {
        let after: number, within: number // resolve the more expressive options to a simpler representation
        if (options.tolerance !== undefined) {
            assert(
                options.after !== undefined,
                "tolerance must be used with after",
            )
            assert(
                options.within == undefined,
                "tolerance may not be used with within",
            )
            after = options.after - options.tolerance
            within = options.after + options.tolerance
        } else {
            after = options.after === undefined ? 0 : options.after
            within =
                options.within === undefined
                    ? Number.POSITIVE_INFINITY
                    : options.within
        }

        let result: T | null
        let timedOut = false
        const startTimestamp = this.bus.timestamp
        if (within != Number.POSITIVE_INFINITY) {
            // finite within, set a timeout
            const timeoutPromise: Promise<null> = new Promise(resolve =>
                this.bus.scheduler.setTimeout(() => {
                    timedOut = true
                    resolve(null)
                }, within),
            )
            result = await Promise.race([promise, timeoutPromise])
        } else {
            // infinite within, don't set a separate timeout
            result = await promise
        }

        if (!timedOut) {
            // got an event, know it did not time out (past specified interval)
            const elapsedTime = this.bus.timestamp - startTimestamp
            if (elapsedTime < after) {
                if (options.tolerance !== undefined) {
                    throw new WaitTimeoutError(
                        `got event at ${elapsedTime} ms, before after=${after} ms (${options.after}±${options.tolerance} ms)`,
                    )
                } else {
                    throw new WaitTimeoutError(
                        `got event at ${elapsedTime} ms, before after=${after} ms`,
                    )
                }
            } else {
                return result as T
            }
        } else {
            if (options.tolerance !== undefined) {
                throw new WaitTimeoutError(
                    `timed out at within=${within} ms (${options.after}±${options.tolerance} ms)`,
                )
            } else {
                throw new WaitTimeoutError(`timed out at within=${within} ms`)
            }
        }
    }

    async waitFor(
        events: TesterEvent | TesterEvent[],
        options: SynchronizationTimingOptions = {},
    ): Promise<number> {
        let eventsList: TesterEvent[]
        if (Array.isArray(events)) {
            eventsList = events
        } else if (events instanceof TesterEvent) {
            eventsList = [events]
        } else {
            throw Error("events not a TesterEvent[] or TeseterEvent")
        }

        // TODO the returned timing may be a bit inconsistent with options for realtime systems
        const start = this.bus.scheduler.timestamp
        let firstTriggerTime: number | undefined = undefined // for synchronization

        // This wraps all the promises with the timing bounds, then wraps them again with synchronization bounds
        const triggerPromises: Promise<unknown>[] = []
        const holdingListeners: HoldingListener[] = []
        eventsList.forEach(event => {
            const { triggerPromise, holdingListener: holdingPromise } =
                event.makePromise()

            if (triggerPromise !== undefined) {
                // wrap with timing code
                const timedPromise = this.makePromiseTimed(
                    triggerPromise,
                    options,
                )
                // wrap trigger promise with synchronization code - TODO: unify?
                if (options.synchronization !== undefined) {
                    const wrappedPromise = timedPromise.then(() => {
                        if (firstTriggerTime === undefined) {
                            firstTriggerTime = this.bus.scheduler.timestamp
                        } else {
                            const triggerDelta =
                                this.bus.scheduler.timestamp - firstTriggerTime
                            if (triggerDelta > options.synchronization) {
                                throw new WaitSynchronizationError(
                                    `event triggered ${triggerDelta} ms from first, greater than maximum ${options.synchronization}`,
                                )
                            }
                        }
                        return undefined
                    })
                    triggerPromises.push(wrappedPromise)
                } else {
                    triggerPromises.push(timedPromise)
                }
            }
            if (holdingPromise !== undefined) {
                holdingListeners.push(holdingPromise)
            }
        })

        // Per Promise.all documentation, this rejects when any rejects.
        const holdingPromises = holdingListeners.map(
            holdingListener => holdingListener.holdingPromise,
        )
        await Promise.race(holdingPromises.concat(Promise.all(triggerPromises)))
        const end = this.bus.scheduler.timestamp

        // Clean up any holding promises
        holdingListeners.forEach(holdingListener =>
            holdingListener.terminateHold(),
        )

        return end - start
    }
}

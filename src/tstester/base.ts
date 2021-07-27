// Contains foundational abstractions for the testing system

import { JDBus } from "../jdom/bus"
import { assert } from "../jdom/utils"

// TODO separate out some kind of human (tester) interface class? which can have different implementations,
// eg web button or physical Jacdac module button?

// Something that can be listened on and represents an instant in time.
// This describes an event, but does not immediately start listening for events.
abstract class TesterEvent {
    public makePromise: Promise<unknown>

}

// A condition that can be asserted for a duration, implemented as listeners
// This describes a condition, but does not immediately start listening for the condition.
abstract class TesterCondition {

}
// An error that fires when the after/within/tolerance in WaitTimingOptions is not met.
class WaitTimeoutError extends Error {
}

export interface WaitTimingOptions {
    after?: number // event must happen at least this many ms after the current time (by default, 0)
    within?: number // event must happen within this many ms after the current time (by default, infinite)
    tolerance?: number // when after is set, sets the allowable range for the event to be tolerance on either side of after
    // is an error if within is set, or after is not set
}

export class TestDriver {
    constructor(protected readonly bus: JDBus) {

    }

    // Promise wrapper that adds timing conditions.
    // If the input promise resolves in the timing window, its results are returned.
    // Otherwise, a WaitTimeoutError is thrown.
    protected async makePromiseTimed<T>(promise: Promise<T>, options?: WaitTimingOptions): Promise<T> {
        let after: number, within: number  // resolve the more expressive options to a simpler representation
        if (options.tolerance !== undefined) {
            assert(
                options.after !== undefined,
                "tolerance must be used with after"
            )
            assert(
                options.within == undefined,
                "tolerance may not be used with within"
            )
            after = options.after - options.tolerance
            within = options.after + options.tolerance
        } else {
            after = options.after === undefined ? 0 : options.after
            within = options.within === undefined
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
                }, within)
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
                        `got event at ${elapsedTime} ms, before after=${after} ms (${options.after}±${options.tolerance} ms)`
                    )
                } else {
                    throw new WaitTimeoutError(
                        `got event at ${elapsedTime} ms, before after=${after} ms`
                    )
                }
            } else {
                return result as T
            }
        } else {
            if (options.tolerance !== undefined) {
                throw new WaitTimeoutError(
                    `timed out at within=${within} ms (${options.after}±${options.tolerance} ms)`
                )
            } else {
                throw new WaitTimeoutError(`timed out at within=${within} ms`)
            }
        }
    }

    // Waits for an event, with optional timing parameters.
    // Returns the amount of time spent waiting, or throws an error if not within timing bounds.
    async waitFor(event: TesterEvent, options?: WaitTimingOptions): Promise<number> {
        // TODO the returned timing may be a bit inconsistent with options for realtime systems
        const start = this.bus.scheduler.timestamp
        await this.makePromiseTimed(event.makePromise, options)
        const end = this.bus.scheduler.timestamp
        return end - start
    }

    // Waits for multiple events, with optional timing parameters.
    // All events must fire within the timing window, but with no constarints on order.
    // Returns the amount of time spent waiting to the last event, or throws an error if not within timing bounds.
    //
    // TODO should there be a separate, tighter synchronization timing window?
    async waitForSynchronized(events: TesterEvent[], options?: WaitTimingOptions): Promise<number> {
        // TODO the returned timing may be a bit inconsistent with options for realtime systems
        const start = this.bus.scheduler.timestamp
        // This just wraps all the events into a promise and waits for all of them
        // Per Promise.all documentation, this rejects when any rejects.
        const promises = events.map(event => this.makePromiseTimed(event.makePromise, options))
        await Promise.all(promises)
        const end = this.bus.scheduler.timestamp
        return end - start
    }

    // Requires the listed conditions hold while the inner function is running.
    // TODO how to make this ignore waitFor conditions that might overlap?
    // Or must the user disambiguate explicitly?
    async requireWhile(conds: TesterCondition[], fn: () => Promise<void>) {
        throw new Error("not implemented =(")
    }
}

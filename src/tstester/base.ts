// Contains foundational abstractions for the testing system

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
    // Promise wrapper that adds timing conditions.
    // If the input promise resolves in the timing window, its results are returned.
    // Otherwise, a WaitTimeoutError is thrown.
    protected makePromiseTimed<T>(basePromose: Promise<T>, options?: WaitTimingOptions): Promise<T> {

    }

    // Waits for an event, with optional timing parameters.
    // Returns the amount of time spent waiting, or throws an error if not within timing bounds.
    async waitFor(event: TesterEvent, options?: WaitTimingOptions): Promise<number> {
        // TODO direct topy of nextEventFromInternal
    }

    // Waits for multiple events, with optional timing parameters.
    // All events must fire within the timing window, but with no constarints on order.
    // Returns the amount of time spent waiting to the last event, or throws an error if not within timing bounds.
    //
    // TODO should there be a separate, tighter synchronization timing window?
    async waitForSynchronized(events: TesterEvent[], options?: WaitTimingOptions): Promise<number> {
        // TODO how to handle sync?
        // Wrap all promises into a timed promise and AND them?
    }

    // Requires the listed conditions hold while the inner function is running.
    // TODO how to make this ignore waitFor conditions that might overlap?
    // Or must the user disambiguate explicitly?
    async requireWhile(conds: TesterCondition[], fn: () => Promise<void>) {
        await fn()

    }
}

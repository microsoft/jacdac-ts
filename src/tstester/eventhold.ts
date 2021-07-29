// Utilities for working with the event-with-hold abstraction

import { EventWithHold, TesterEvent } from "./base";

interface EventWithHoldAdapterInterface<T> {
    // Function that starts listening for some event, firing the callback (handler).
    // This should be persistent (recurring, not one-shot)
    // Returns the handle that can later be used to de-register the callback.
    register: (handler: (data: T) => void) => unknown
    // Function that given a handle (return from the above), de-registers the callback
    deregister: (handle: unknown) => void

    // Called on each callback before the trigger condition. Returns true if this meets the trigger condition.
    // Throws an error if some condition is not met.
    // Leave empty if this does not trigger (or "triggers" instantly on creation)
    processTrigger?: (data: T) => boolean

    // Called on each callback after the trigger condition. Throws an error if some holding condition is not met.
    // Leave empty if there are no post-trigger holding conditions.
    processHold?: (data: T) => void
}

export class EventWithHoldAdapter<T> extends TesterEvent {
    constructor(protected readonly eventDescriptor: EventWithHoldAdapterInterface<T>) {
        super()
    }

    public makePromise() {
        return undefined as EventWithHold
    }
}

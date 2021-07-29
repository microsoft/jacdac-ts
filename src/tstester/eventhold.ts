// Utilities for working with the event-with-hold abstraction

import { TesterEvent } from "./base";

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

    // Note that on any callback, exactly one of processTrigger or processHold will be called.
}

export class EventWithHoldAdapter<T> extends TesterEvent {
    constructor(protected readonly eventDescriptor: EventWithHoldAdapterInterface<T>) {
        super()
    }

    public makePromise() {
        let triggerResolve: (value: unknown) => void  // value not used, but needs an argument there
        let triggerReject: (reason: Error) => void
        const triggerPromise = this.eventDescriptor.processTrigger === undefined ? undefined : // only create promise if needed
            new Promise((resolve, reject) => {
                triggerResolve = resolve
                triggerReject = reject
            })


        let holdingReject: (reason: Error) => void
        const holdingPromise = this.eventDescriptor.processHold === undefined ? undefined : // only create promise if needed
            new Promise((resolve, reject) => {
                holdingReject = reject
            })

        let resolved = triggerPromise === undefined ? true : false  // no trigger condition effectively means resolved
        const handler = (data: T) => {
            if (!resolved && this.eventDescriptor.processTrigger !== undefined) {
                let triggered = false
                try {
                    triggered = this.eventDescriptor.processTrigger(data)
                } catch (e) {
                    triggerReject(e)
                    this.eventDescriptor.deregister(handlerHandle)
                }
                if (triggered) {
                    triggerResolve(undefined)
                    resolved = true
                    if (this.eventDescriptor.processHold !== undefined) {
                        this.eventDescriptor.deregister(handlerHandle)
                    }
                }
            } else if (resolved && this.eventDescriptor.processHold !== undefined) {
                try {
                    this.eventDescriptor.processHold(data)
                } catch (e) {
                    holdingReject(e)
                    this.eventDescriptor.deregister(handlerHandle)
                }
            }
        }

        const handlerHandle = this.eventDescriptor.register(handler)
        const terminateHold = () => {
            this.eventDescriptor.deregister(handlerHandle)
        }

        return {triggerPromise, holdingListener: {holdingPromise, terminateHold}}
    }
}

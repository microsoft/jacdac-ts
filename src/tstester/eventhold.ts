// Utilities for working with the event-with-hold abstraction

import { assert } from "../jdom/utils";
import { TesterEvent } from "./base";

export abstract class EventWithHoldAdapter<T> extends TesterEvent {
    // Function that starts listening for some event, firing the callback (handler).
    // This should be persistent (recurring, not one-shot)
    // Returns the handle that can later be used to de-register the callback.
    protected abstract register(handler: (data: T) => void): unknown

    // Function that given a handle (return from the above), de-registers the callback
    protected abstract deregister(handle: unknown): void

    protected processTrigger(data: T): boolean {
        throw new Error("this function should never be called when not overridden")
    }

    protected processHold(data: T): void {
        throw new Error("this function should never be called when not overridden")
    }

    protected get hasTrigger() {
        // TODO this detection ... it works but it feels weird
        return this.processTrigger !== EventWithHoldAdapter.prototype.processTrigger
    }

    protected get hasHold() {
        // TODO this detection ... it works but it feels weird
        return this.processHold !== EventWithHoldAdapter.prototype.processHold
    }

    public makePromise() {
        assert(this.hasTrigger || this.hasHold, "EventWithHoldAdapter must define processTrigger or processHold")

        let triggerResolve: (value: unknown) => void  // value not used, but needs an argument there
        let triggerReject: (reason: Error) => void
        const triggerPromise = !this.hasTrigger ? undefined : // only create promise if needed
            new Promise((resolve, reject) => {
                triggerResolve = resolve
                triggerReject = reject
            })


        let holdingReject: (reason: Error) => void
        const holdingPromise = !this.hasHold ? undefined : // only create promise if needed
            new Promise((resolve, reject) => {
                holdingReject = reject
            })

        let resolved = this.hasTrigger ? false : true  // no trigger condition effectively means resolved
        const handler = (data: T) => {
            if (!resolved) {
                assert(this.hasTrigger, "non-resolved without trigger defined")
                let triggered = false
                try {
                    triggered = this.processTrigger(data)
                } catch (e) {
                    triggerReject(e)
                    this.deregister(handlerHandle)
                }
                if (triggered) {
                    triggerResolve(undefined)
                    resolved = true
                    if (this.processHold !== undefined) {
                        this.deregister(handlerHandle)
                    }
                }
            } else if (resolved && this.hasHold) {
                try {
                    this.processHold(data)
                } catch (e) {
                    holdingReject(e)
                    this.deregister(handlerHandle)
                }
            }
        }

        const handlerHandle = this.register(handler)
        const terminateHold = () => {
            this.deregister(handlerHandle)
        }

        return {
            triggerPromise, 
            holdingListener: this.hasHold ? {holdingPromise, terminateHold} : undefined
        }
    }
}

import { EVENT, JDEvent, JDService } from "../jdom/jacdac-jdom"
import { TesterEvent } from "./base"
import { TestingNamer } from "./naming"
import { RegisterTester } from "./registerwrapper"


// Event that fires on a matching event code from the specified service
class ServiceEventEvent extends TesterEvent {
    constructor(protected readonly service: ServiceTester, protected eventCode: number) {
        super()
    }
    
    public makePromise() {
        const triggerPromise = new Promise((resolve) => {
            const bus = this.service.service.device.bus
            const handler = (event: JDEvent) => {
                if (event.code == this.eventCode) {
                    bus.off(EVENT, handler)
                    resolve(undefined)
                }
            }
            bus.on(EVENT, handler)
        })
        return {triggerPromise}
    }
}

// An error that fires if the next does not match
class ServiceNextEventError extends Error {
}

// Event that fires on the next event, which must match the eventCode
class ServiceNextEventEvent extends TesterEvent {
    constructor(protected readonly service: ServiceTester, protected eventCode?: number) {
        super()
    }
    
    public makePromise() {
        const triggerPromise = new Promise((resolve, reject) => {
            const bus = this.service.service.device.bus
            const handler = (event: JDEvent) => {
                if (this.eventCode === undefined || event.code == this.eventCode) {
                    resolve(undefined)
                } else {
                    reject(new ServiceNextEventError(`service got next event ${event.code} (${event.name}) not expected ${this.eventCode}`))
                }
            }
            bus.once(EVENT, handler)
        })
        return {triggerPromise}
    }

    public hold() {
        return new ServiceNextEventHeldEvent(this.service, this.eventCode)
    }
}

// Event that additionally checks for absence of further events by rejecting the promise
class ServiceNextEventHeldEvent extends TesterEvent {
    constructor(protected readonly service: ServiceTester, protected eventCode?: number) {
        super()
    }

    public makePromise() {
        const bus = this.service.service.device.bus

        // TODO this code is really ugly, idk how to fix this while only having one bus.on that is consistent
        // TODO can this be deduplicated with NextEvent (without the hold), and with OnEvent (ignores nonmatching events)?
        // This promise will not reject until after the main promise resolves
        let holdingReject: (reason: Error) => void
        let terminateHolding: () => void
        const holdingPromise = new Promise((resolve, reject) => {
            holdingReject = reject
        })

        // This is the trigger condition only
        let resolved = false
        const triggerPromise = new Promise((resolve, reject) => {
            const handler = (event: JDEvent) => {
                if (resolved) {
                    holdingReject(new Error(`service got event ${event.code} (${event.name}) when hold asserted`))
                    bus.off(EVENT, handler)
                } else if (this.eventCode === undefined || event.code == this.eventCode) {
                    resolved = true
                    resolve(undefined)
                } else {
                    bus.off(EVENT, handler)
                    reject(new ServiceNextEventError(`service got next event ${event.code} (${event.name}) not expected ${this.eventCode}`))
                }
            }

            terminateHolding = () => {
                bus.off(EVENT, handler)
            }

            bus.on(EVENT, handler)
        })

        return {triggerPromise, holdingListener: {holdingPromise, terminateHolding}}
    }
}

export class ServiceTester {
    constructor(readonly service: JDService) {

    }

    public get name() {
        return TestingNamer.nameOfService(this.service)
    }

    public register(registerCode: number) {
        return new RegisterTester(this.service.register(registerCode))
    }

    // Event that fires on a service event
    public onEvent(eventCode: number) {
        return new ServiceEventEvent(this, eventCode)
    }

    // Event that fires on the next service event, which optionally must be of the eventCode
    public nextEvent(eventCode?: number) {
        return new ServiceNextEventEvent(this, eventCode)
    }

    // Condition that no event fires
    // TODO how to define this mutually exclusive with trigger events?
    public noEvent() {
        throw new Error("not implemented")
    }
}

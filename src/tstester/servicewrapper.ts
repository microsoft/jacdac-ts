import { EVENT, EventHandler, JDEvent, JDService } from "../jdom/jacdac-jdom"
import { TesterEvent } from "./base"
import { EventWithHoldAdapter } from "./eventhold"
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
                    reject(new ServiceNextEventError(`service ${this.service.name} got next event ${event.code} (${event.name}) not expected ${this.eventCode}`))
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
class ServiceNextEventHeldEvent extends EventWithHoldAdapter<JDEvent> {
    constructor(protected readonly service: ServiceTester, protected eventCode?: number) {
        super({
            register: (handler: (event: JDEvent) => void) => {
                return service.service.device.bus.on(EVENT, handler)
            },
            deregister: (handle: unknown) => {
                service.service.device.bus.off(EVENT, handle as EventHandler)
            },
            processTrigger: (event: JDEvent) => {
                if (this.eventCode === undefined || event.code == this.eventCode) {
                    return true
                } else {
                    throw new ServiceNextEventError(`service ${this.service.name} got next event ${event.code} (${event.name}) not expected ${this.eventCode}`)
                }
            },
            processHold: (event: JDEvent) => {
                throw new Error(`service ${this.service.name} got event ${event.code} (${event.name}) when hold asserted`)
            }
        })
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

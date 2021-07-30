import { EVENT, EventHandler, JDEvent, JDService } from "../jdom/jacdac-jdom"
import { TesterEvent } from "./base"
import { EventWithHoldAdapter } from "./eventhold"
import { TestingNamer } from "./naming"
import { RegisterTester } from "./registerwrapper"


class BaseServiceEventEvent extends EventWithHoldAdapter<JDEvent> {
    constructor(protected readonly service: ServiceTester, protected eventCode?: number) {
        super()
    }

    protected register(handler: (data: JDEvent) => void) {
        return this.service.service.device.bus.on(EVENT, handler)
    }

    protected deregister(handle: unknown) {
        this.service.service.device.bus.off(EVENT, handle as EventHandler)
    }
}

// Event that fires on a matching event code from the specified service
class ServiceEventEvent extends BaseServiceEventEvent {
    constructor(protected readonly service: ServiceTester, protected eventCode: number) {
        super(service, eventCode)
    }
    
    protected processTrigger(data: JDEvent) {
        if (data.code == this.eventCode) {
            return true
        }
    }
}

// An error that fires if the next does not match
class ServiceNextEventError extends Error {
}

// Event that fires on the next event, which must match the eventCode
class ServiceNextEventEvent extends BaseServiceEventEvent {
    protected processTrigger(data: JDEvent) {
        if (this.eventCode === undefined || data.code == this.eventCode) {
            return true
        } else {
            throw new ServiceNextEventError(`service ${this.service.name} got next event ${data.code} (${data.name}) not expected ${this.eventCode}`)
        }
    }

    public hold() {
        return new ServiceNextEventHeldEvent(this.service, this.eventCode)
    }
}

// Event that additionally checks for absence of further events by rejecting the promise
class ServiceNextEventHeldEvent extends BaseServiceEventEvent {
    protected processTrigger(data: JDEvent) {
        if (this.eventCode === undefined || data.code == this.eventCode) {
            return true
        } else {
            throw new ServiceNextEventError(`service ${this.service.name} got next event ${data.code} (${data.name}) not expected ${this.eventCode}`)
        }
    }

    protected processHold(data: JDEvent) {
        throw new Error(`service ${this.service.name} got event ${data.code} (${data.name}) when hold asserted`)
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

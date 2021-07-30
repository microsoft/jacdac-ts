import { EVENT, EventHandler, JDEvent, JDService } from "../jdom/jacdac-jdom"
import { EventWithHoldAdapter } from "./eventhold"
import { TestingNamer } from "./naming"
import { RegisterTester } from "./registerwrapper"

// Base service events trigger that handles bus on/off
class BaseServiceEventTrigger extends EventWithHoldAdapter<JDEvent> {
    constructor(
        protected readonly service: ServiceTester,
        protected eventCode?: number
    ) {
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
class BaseServiceAnyEventTrigger extends BaseServiceEventTrigger {
    constructor(
        protected readonly service: ServiceTester,
        protected eventCode: number
    ) {
        super(service, eventCode)
    }

    protected processTrigger(data: JDEvent) {
        if (data.code == this.eventCode) {
            return true
        }
    }
}

// Provides an additional .hold() interface to convert this into a ServiceNextEventHeldTrigger
class ServiceAnyEventTrigger extends BaseServiceAnyEventTrigger {
    public hold() {
        return new ServiceAnyEventHeldTrigger(this.service, this.eventCode)
    }
}

// Event that additionally checks for absence of further events by rejecting the promise
class ServiceAnyEventHeldTrigger extends BaseServiceAnyEventTrigger {
    protected processHold(data: JDEvent) {
        throw new Error(
            `service ${this.service.name} got event ${data.code} (${data.name}) when hold asserted`
        )
    }
}

// An error that fires if the next does not match
class ServiceNextEventError extends Error {}

// Event that fires on the next event, which must match the eventCode
class BaseServiceNextEventTrigger extends BaseServiceEventTrigger {
    protected processTrigger(data: JDEvent) {
        if (this.eventCode === undefined || data.code == this.eventCode) {
            return true
        } else {
            throw new ServiceNextEventError(
                `service ${this.service.name} got next event ${data.code} (${data.name}) not expected ${this.eventCode}`
            )
        }
    }
}

// Provides an additional .hold() interface to convert this into a ServiceNextEventHeldTrigger
class ServiceNextEventTrigger extends BaseServiceNextEventTrigger {
    public hold() {
        return new ServiceNextEventHeldTrigger(this.service, this.eventCode)
    }
}

// Event that additionally checks for absence of further events by rejecting the promise
class ServiceNextEventHeldTrigger extends BaseServiceNextEventTrigger {
    protected processHold(data: JDEvent) {
        throw new Error(
            `service ${this.service.name} got event ${data.code} (${data.name}) when hold asserted`
        )
    }
}

export class ServiceTester {
    constructor(readonly service: JDService) {}

    public get name() {
        return TestingNamer.nameOfService(this.service)
    }

    public register(registerCode: number) {
        return new RegisterTester(this.service.register(registerCode))
    }

    // Event that fires on a service event
    public onEvent(eventCode: number) {
        return new ServiceAnyEventTrigger(this, eventCode)
    }

    // Event that fires on the next service event, which optionally must be of the eventCode
    public nextEvent(eventCode?: number) {
        return new ServiceNextEventTrigger(this, eventCode)
    }

    // Condition that no event fires
    // TODO how to define this mutually exclusive with trigger events?
    public noEvent() {
        throw new Error("not implemented")
    }
}

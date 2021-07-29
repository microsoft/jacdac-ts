import { DeviceFilter, DEVICE_ANNOUNCE, EVENT, JDBus, JDDevice, JDEvent, JDRegister, JDService, jdunpack, PackedValues, Packet, REPORT_RECEIVE, ServiceFilter } from "../jdom/jacdac-jdom"
import { HeldTesterEvent, TesterCondition, TesterEvent } from "./base"


export class BusTester {
    constructor(readonly bus: JDBus) {
    }

    public devices(options?: DeviceFilter) {
        return this.bus.devices(options).map(device => new DeviceTester(device))
    }

    public async nextConnected(): Promise<DeviceTester> {
        const promise = new Promise<DeviceTester>(resolve => {
            this.bus.once(DEVICE_ANNOUNCE, (device: JDDevice) => {
                resolve(new DeviceTester(device))
            })
        })
        
        return promise
    }
}

export class DeviceTester {
    constructor(readonly device: JDDevice) {

    }

    public name() {
        return this.device.shortId
    }

    public services(options?: ServiceFilter) {
        return this.device.services(options).map(service => new ServiceTester(service))
    }
}

// Event that fires on a matching event code from the specified service
class ServiceEventEvent extends TesterEvent {
    constructor(protected readonly service: JDService, protected eventCode: number) {
        super()
    }
    
    public makePromise() {
        return new Promise((resolve) => {
            const bus = this.service.device.bus
            const handler = (event: JDEvent) => {
                if (event.code == this.eventCode) {
                    bus.off(EVENT, handler)
                    resolve(undefined)
                }
            }
            bus.on(EVENT, handler)
        })
    }
}

// An error that fires if the next does not match
class ServiceNextEventError extends Error {
}

// Event that fires on the next event, which must match the eventCode
class ServiceNextEventEvent extends TesterEvent {
    constructor(protected readonly service: JDService, protected eventCode?: number) {
        super()
    }
    
    public makePromise() {
        return new Promise((resolve, reject) => {
            const bus = this.service.device.bus
            const handler = (event: JDEvent) => {
                if (this.eventCode === undefined || event.code == this.eventCode) {
                    resolve(undefined)
                } else {
                    reject(new ServiceNextEventError(`service got next event ${event.code} (${event.name}) not expected ${this.eventCode}`))
                }
            }
            bus.once(EVENT, handler)
        })
    }

    public hold() {
        return new ServiceNextEventHeldEvent(this.service, this.eventCode)
    }
}

// Event that additionally checks for absence of further events by rejecting the promise
class ServiceNextEventHeldEvent extends HeldTesterEvent {
    constructor(protected readonly service: JDService, protected eventCode?: number) {
        super()
    }

    public makePromiseWithHold() {
        const bus = this.service.device.bus

        // TODO this code is really ugly, idk how to fix this while only having one bus.on that is consistent
        // TODO can this be deduplicated with NextEvent (without the hold), and with OnEvent (ignores nonmatching events)?
        // This promise will not reject until after the main promise resolves
        let holdingReject: (reason: Error) => void
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

            bus.on(EVENT, handler)
        })

        return {triggerPromise, holdingPromise}
    }
}

export class ServiceTester {
    constructor(readonly service: JDService) {

    }

    public name() {
        return `${this.service.device.shortId}.${this.service.specification.name}`
    }

    public register(registerCode: number) {
        return new RegisterTester(this.service.register(registerCode))
    }

    // Event that fires on a service event
    public onEvent(eventCode: number) {
        return new ServiceEventEvent(this.service, eventCode)
    }

    // Event that fires on the next service event, which optionally must be of the eventCode
    public nextEvent(eventCode?: number) {
        return new ServiceNextEventEvent(this.service, eventCode)
    }

    // Condition that no event fires
    // TODO how to define this mutually exclusive with trigger events?
    public noEvent() {
        throw new Error("not implemented")
    }
}

// An error that fires if the register is not within bounds before the trigger
class RegisterPreConditionError extends Error {
}

// TODO support non-[number] registers?
export interface RegisterUpdateOptions {
    preRequiredRange?: [number, number]  // if defineds, requires all values before the trigger are within this range and not undefined
    triggerRange?: [number, number]  // acceptable range of trigger conditions, otherwise triggers on any sample
}

// Event that fires on a matching register change from the specified service
class RegisterUpdateEvent extends TesterEvent {
    constructor(protected readonly register: JDRegister, protected options: RegisterUpdateOptions) {
        super()
    }
    
    // Hacky wrapper around a PackedValues [number] that extracts the single value
    protected maybeGetValue(raw: PackedValues): number | undefined {
        if (raw === undefined) {
            return undefined
        } else {
            return (raw as [number])[0]
        }
    }

    public makePromise() {
        const packFormat = this.register.specification.packFormat

        return new Promise((resolve, reject) => {
            const handler = (packet: Packet) => {
                const thisValue = this.maybeGetValue(jdunpack(packet.data, packFormat))

                // check if the sample is valid for preRequiredRange
                const precondition = this.options.preRequiredRange === undefined || (
                    thisValue !== undefined &&
                    thisValue >= this.options.preRequiredRange[0] && thisValue <= this.options.preRequiredRange[1]
                )
                // whether or not toRange is defined, the current sample must be valid
                const triggered = thisValue !== undefined && (
                    (this.options.triggerRange === undefined ||
                        (thisValue >= this.options.triggerRange[0] && thisValue <= this.options.triggerRange[1])))

                if (triggered) {  // ignore precondition on trigger
                    this.register.off(REPORT_RECEIVE, handler)
                    resolve(undefined)
                } else if (!precondition) {  // otherwise assert precondition
                    reject(new RegisterPreConditionError(`register value ${thisValue} not in precondition ${this.options.preRequiredRange}`))
                }
            }
            this.register.on(REPORT_RECEIVE, handler)
        })
    }
}

export class RegisterTester {
    constructor(readonly register: JDRegister) {

    }

    public name() {
        return `${this.register.service.device.shortId}.${this.register.service.specification.name}.${this.register.name}`
    }

    // Event that fires on a register update (even with unchagned value), optionally with a starting (arming) and to (trigger) filter
    public onUpdate(options: RegisterUpdateOptions = {}) {
        return new RegisterUpdateEvent(this.register, options)
    }

    public condition() {
        throw new Error("not implemented")
    }
}

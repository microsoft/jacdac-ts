import { DeviceFilter, DEVICE_ANNOUNCE, EVENT, JDBus, JDDevice, JDEvent, JDRegister, JDService, ServiceFilter } from "../jdom/jacdac-jdom"
import { TesterCondition, TesterEvent } from "./base"


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

export class ServiceTester {
    constructor(readonly service: JDService) {

    }

    public name() {
        return this.service.specification.name
    }

    public register(registerCode: number) {
        return new RegisterTester(this.service.register(registerCode))
    }

    // Event that fires on a service event
    public onEvent(eventCode: number): TesterEvent {
        return new ServiceEventEvent(this.service, eventCode)
    }

    // Condition that no event fires
    // TODO how to define this mutually exclusive with trigger events?
    public noEvent(): TesterCondition {
        throw new Error("not implemented")
    }
}

export class RegisterTester {
    constructor(readonly register: JDRegister) {

    }

    // Event that fires when the register changes, optionally with a from and to filter
    public onChange(): TesterEvent {
        throw new Error("not implemented")
    }

    public condition(): TesterCondition {
        throw new Error("not implemented")
    }
}

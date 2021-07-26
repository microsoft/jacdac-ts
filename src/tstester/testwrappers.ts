import { DeviceFilter, DEVICE_ANNOUNCE, JDBus, JDDevice, JDRegister, JDService, ServiceFilter } from "../jdom/jacdac-jdom"

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

    }

    // Condition that no event fires
    // TODO how to define this mutually exclusive with trigger events?
    public noEvent(): TesterCondition {

    }
}

export class RegisterTester {
    constructor(readonly register: JDRegister) {

    }

    // Event that fires when the register changes, optionally with a from and to filter
    public onChange(): TesterEvent {

    }

    public condition(): TesterCondition {

    }
}

import { DeviceFilter, DEVICE_ANNOUNCE, EVENT, JDBus, JDDevice, JDEvent, JDRegister, JDService, jdunpack, PackedValues, Packet, REPORT_RECEIVE, ServiceFilter } from "../jdom/jacdac-jdom"
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
        return `${this.service.device.shortId}.${this.service.specification.name}`
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

// TODO support non-[number] registers?
export interface RegisterUpdateOptions {
    fromValue?: number
    fromTolerance?: number  // from tolerates a value up to this different (positive magnitude), defaults to 0
    toValue?: number
    toTolerance?: number  // to tolerates a value up to this different (positive magnitude), default to 0
}

// Event that fires on a matching register change from the specified service
class RegisterUpdateEvent extends TesterEvent {
    constructor(protected readonly register: JDRegister, protected options: RegisterUpdateOptions) {
        super()
    }
    
    protected maybeGetValue(raw: PackedValues): number | undefined {
        if (raw === undefined) {
            return undefined
        } else {
            return (raw as [number])[0]
        }
    }

    public makePromise() {
        const packFormat = this.register.specification.packFormat
        let lastValue = this.maybeGetValue(this.register.unpackedValue)  // needed for change detection
        // TODO what if this is undefined?

        return new Promise((resolve) => {
            const handler = (packet: Packet) => {
                const unpackedValue = this.maybeGetValue(jdunpack(packet.data, packFormat))

                const fromTolerance = this.options.fromTolerance || 0
                const toTolerance = this.options.toTolerance || 0
                if ((this.options.fromValue === undefined || Math.abs(lastValue - this.options.fromValue) <= fromTolerance) &&
                    (this.options.toValue === undefined || Math.abs(unpackedValue - this.options.toValue)) <= toTolerance) {
                    this.register.off(REPORT_RECEIVE, handler)
                    resolve(undefined)
                } else {
                    lastValue = unpackedValue
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

    // Event that fires when the register changes, optionally with a from and to filter
    public onUpdate(options: RegisterUpdateOptions = {}): TesterEvent {
        return new RegisterUpdateEvent(this.register, options)
    }

    public condition(): TesterCondition {
        throw new Error("not implemented")
    }
}

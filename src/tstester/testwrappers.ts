import { DeviceFilter, DEVICE_ANNOUNCE, EVENT, JDBus, JDDevice, JDEvent, JDRegister, JDService, jdunpack, PackedValues, Packet, REPORT_RECEIVE, ServiceFilter } from "../jdom/jacdac-jdom"
import { HeldTesterEvent, TesterCondition, TesterEvent } from "./base"
import { ServiceTester } from "./servicewrapper"


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
    // Utility method to provide a standaradized debug name
    public static nameOf(device: JDDevice) {
        return device.shortId
    }

    constructor(readonly device: JDDevice) {

    }

    public get name() {
        return DeviceTester.nameOf(this.device)
    }

    public services(options?: ServiceFilter) {
        return this.device.services(options).map(service => new ServiceTester(service))
    }
}

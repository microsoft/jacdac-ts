import {
    DeviceFilter,
    DEVICE_ANNOUNCE,
    JDBus,
    JDDevice,
    ServiceFilter,
} from "../jdom/jacdac-jdom"
import { TestingNamer } from "./naming"
import { ServiceTester } from "./servicewrapper"

export class BusTester {
    constructor(readonly bus: JDBus) {}

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
    constructor(readonly device: JDDevice) {}

    public get name() {
        return TestingNamer.nameOfDevice(this.device)
    }

    public services(options?: ServiceFilter) {
        return this.device
            .services(options)
            .map(service => new ServiceTester(service))
    }
}

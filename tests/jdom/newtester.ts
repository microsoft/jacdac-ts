import { JDBus } from "../../src/jdom/bus"
import { DEVICE_ANNOUNCE } from "../../src/jdom/constants"
import { JDDevice } from "../../src/jdom/device"
import JDServiceProvider from "../../src/jdom/serviceprovider"
import JDServiceServer from "../../src/jdom/serviceserver"
import { assert } from "../../src/jdom/utils"
import {
    DebugConsoleUi,
    SynchronizationTimingOptions,
    TestDriver,
    TesterEvent,
} from "../../src/tstester/base"
import { BusTester } from "../../src/tstester/testwrappers"
import { loadSpecifications } from "../testutils"
import { FastForwardScheduler } from "./scheduler"
import { CreatedServerService } from "./tester"

// Set equals is not a built-in operation.
function setEquals<T>(set1: Set<T>, set2: Set<T>): boolean {
    if (set1.size != set2.size) {
        return false
    }
    set1.forEach(value => {
        if (!set2.has(value)) {
            return false
        }
    })
    return true
}

// A bus test wrapper that uses the fast-forward bus and provides test helper functions
// to spin up virtual devices.
// TODO: should this / can this be merged w/ FastForwardTestDriver?
//   both use the FF scheduler, and it might make sense to combine the classes
export class FastForwardBusTester extends BusTester {
    static makeTest(test: (bus: FastForwardBusTester) => Promise<void>) {
        return async () => {
            await this.withTestBus(test)
        }
    }

    // Wrapper that provides bus construction, initializaiton, and teardown
    static async withTestBus(
        test: (bus: FastForwardBusTester) => Promise<void>
    ) {
        const tester = new FastForwardBusTester()
        tester.start()
        try {
            await test(tester)
        } finally {
            tester.stop()
        }
    }

    readonly scheduler: FastForwardScheduler
    // Unlike BusTester, we initialize a bus here so it uses the FF scheduler
    constructor() {
        super(
            new JDBus([], {
                scheduler: new FastForwardScheduler(),
            })
        )
        loadSpecifications() // TODO this reimplements mkBus
        assert(this.bus.scheduler instanceof FastForwardScheduler)
        this.scheduler = this.bus.scheduler as FastForwardScheduler
    }

    // start() and stop() are made available, but recommend using withTestBus() instead
    public start() {
        this.bus.start()
    }

    public stop() {
        this.bus.stop()
    }

    // Waits for all the devices (by deviceId) to be announced on the bus.
    protected async waitForAnnounce(deviceIds: string[]) {
        return new Promise(resolve => {
            const devicesIdSet = new Set(deviceIds)
            const announcedIdSet = new Set()
            const onHandler = (device: JDDevice) => {
                if (devicesIdSet.has(device.deviceId)) {
                    announcedIdSet.add(device.deviceId)
                }
                if (setEquals(devicesIdSet, announcedIdSet)) {
                    this.bus.off(DEVICE_ANNOUNCE, onHandler)
                    resolve(undefined)
                }
            }
            this.bus.on(DEVICE_ANNOUNCE, onHandler)
        })
    }

    // TODO is there a better abstraction where we can create the service as independent function calls
    // but only have one delay? Would need some way to overlap the creation, and
    // separate the promise / await portion.
    // Perhaps have createService and fast-fowrad await?
    public async createServices<T extends Record<string, JDServiceServer>>(
        servers: T
    ): Promise<{ [key in keyof T]: CreatedServerService<T[key]> }> {
        // attach servers to the bus as devices
        const devices = Object.entries(servers).map(([name, server]) => {
            const device = this.bus.addServiceProvider(
                new JDServiceProvider([server])
            )
            return {
                name: name,
                server: server,
                device: device,
            }
        })

        // Wait for created devices to be announced, so services become available
        const deviceIds = devices.map(elt => elt.device.deviceId)
        await (this.bus.scheduler as FastForwardScheduler).runToPromise(
            this.waitForAnnounce(deviceIds)
        )

        // Create the output map
        const namesToServices: [
            string,
            CreatedServerService<JDServiceServer>
        ][] = devices.map(({ name, server, device }) => {
            const services = device.services({
                serviceClass: server.serviceClass,
            })
            assert(
                services.length > 0,
                `created device ${device.friendlyName} has no service of ${server.specification.name}`
            )
            assert(
                services.length == 1,
                `created device ${device.friendlyName} has multiple service of ${server.specification.name}`
            )
            return [
                name,
                {
                    server: server,
                    service: services[0],
                },
            ]
        })

        const namesToServicesObject = namesToServices.reduce(
            (last, [name, service]) => Object.assign(last, { [name]: service }),
            {}
        )

        return namesToServicesObject as {
            [key in keyof T]: CreatedServerService<T[key]>
        }
    }
}

export class FastForwardTestDriver extends TestDriver {
    readonly scheduler: FastForwardScheduler
    constructor(readonly bus: JDBus) {
        super(bus, new DebugConsoleUi())
        assert(bus.scheduler instanceof FastForwardScheduler)
        this.scheduler = bus.scheduler as FastForwardScheduler
    }

    async waitForAll(
        events: TesterEvent[],
        options: SynchronizationTimingOptions = {}
    ): Promise<number> {
        return await this.scheduler.runToPromise(
            super.waitForAll(events, options)
        )
    }

    // Runs the fast-forward scheduler for some amount of time
    async waitForDelay(millis: number) {
        return this.scheduler.runForDelay(millis)
    }
}

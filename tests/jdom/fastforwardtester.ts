import { JDBus } from "../../src/jdom/bus"
import { DEVICE_ANNOUNCE } from "../../src/jdom/constants"
import JDDevice from "../../src/jdom/device"
import JDService from "../../src/jdom/service"
import JDServiceProvider from "../../src/jdom/serviceprovider"
import JDServiceServer from "../../src/jdom/serviceserver"
import { assert } from "../../src/jdom/utils"
import {
    DebugConsoleUi,
    HoldingListener,
    SynchronizationTimingOptions,
    TestDriver,
    TestDriverInterface,
    TesterEvent,
} from "../../src/tstester/base"
import { BusTester } from "../../src/tstester/testwrappers"
import { loadSpecifications } from "../testutils"
import { FastForwardScheduler } from "./scheduler"

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

// Structure returned from createServices for each server, that contains the server passed in,
// the created device, and the service on the device corresponding to the server.
export interface CreatedServerService<ServiceType extends JDServiceServer> {
    server: ServiceType
    service: JDService
}

export function makeTest(test: (bus: FastForwardTester) => Promise<void>) {
    return async () => {
        await withTestBus(test)
    }
}

// Wrapper that provides bus construction, initializaiton, and teardown
export async function withTestBus(
    test: (bus: FastForwardTester) => Promise<void>
) {
    const tester = new FastForwardTester()
    tester.start()
    try {
        await test(tester)
    } finally {
        tester.stop()
    }
}

// A bus test wrapper that uses the fast-forward bus and provides test helper functions
// to spin up virtual devices.
//
// This additionally wraps the TestDriver interfaces with logic needed to advance simulator time.
// Test code should not create a new TestDriver interface, and instead use the functions exposed
// by this class.
export class FastForwardTester
    extends BusTester
    implements TestDriverInterface
{
    readonly scheduler: FastForwardScheduler
    readonly driver: TestDriver
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
        this.driver = new TestDriver(this.bus, new DebugConsoleUi())
    }

    // start() and stop() are made available, but recommend using withTestBus() instead
    public start() {
        this.bus.start()
        this.scheduler.start() // run in background
    }

    public stop() {
        this.bus.stop()
        this.scheduler.stop()
    }

    // Waits for all the devices (by deviceId) to be announced on the bus.
    protected async waitForAnnounce(deviceIds: string[]) {
        if (deviceIds.length === 0) {
            return Promise.resolve()
        }

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

    // Wrapper arround TestDriver.waitForAll that advances scheduler time
    async waitFor(
        events: TesterEvent | TesterEvent[],
        options: SynchronizationTimingOptions = {}
    ): Promise<number> {
        return this.scheduler.runToPromise(this.driver.waitFor(events, options))
    }

    // Runs the fast-forward scheduler for some amount of time
    async waitForDelay(millis: number) {
        return this.scheduler.runForDelay(millis)
    }

    // Runs the body, asserting that the triggers in events are fired by the time the body ends,
    // and any holding assertions are met.
    // Can be nested.
    async assertWith<T>(
        events: TesterEvent | TesterEvent[],
        body: () => Promise<T>
    ): Promise<T> {
        let eventsList: TesterEvent[] // TODO dedup w/ TestDriver:waitFor
        if (Array.isArray(events)) {
            eventsList = events
        } else if (events instanceof TesterEvent) {
            eventsList = [events]
        } else {
            throw Error("events not a TesterEvent[] or TeseterEvent")
        }

        const triggerPromises: Promise<unknown>[] = []
        const holdingListeners: HoldingListener[] = []
        eventsList.forEach(event => {
            const { triggerPromise, holdingListener } = event.makePromise()
            if (triggerPromise !== undefined) {
                triggerPromises.push(triggerPromise)
            }
            if (holdingListener !== undefined) {
                holdingListeners.push(holdingListener)
            }
        })

        const holdingPromises = holdingListeners.map(
            // fails when any fails (holding listeners cannot complete)
            holdingListener => holdingListener.holdingPromise
        )

        const waitingTriggerPromises = new Set<Promise<unknown>>(
            triggerPromises
        )

        // Stack a promise on top of the body promise to check that all events were satisfied
        const overallPromise = new Promise<T>((resolve, reject) => {
            triggerPromises.forEach(triggerPromise => {
                triggerPromise.then(
                    fulfilled => {
                        // delete the triggered promise from the waiting queue
                        const deleted =
                            waitingTriggerPromises.delete(triggerPromise)
                        assert(deleted, "failed to delete trigger promise")
                    },
                    rejected => {
                        // reject the overall promise if any of the triggering promises reject
                        reject(rejected)
                    }
                )
            })

            holdingPromises.forEach(holdingPromise => {
                holdingPromise.then(
                    fulfilled => {}, // shouldn't happen
                    rejected => {
                        // reject the overall promise if any of the holding promises reject
                        reject(rejected)
                    }
                )
            })

            body().then(value => {
                // only the main body promise can resolve the overall promise
                if (waitingTriggerPromises.size === 0) {
                    resolve(value)
                } else {
                    // TODO better error messages
                    reject(Error("not all events triggered"))
                }
            })
        })
        const value = await this.scheduler.runToPromise(overallPromise)

        holdingListeners.forEach(holdingListener =>
            holdingListener.terminateHold()
        )

        return value
    }
}

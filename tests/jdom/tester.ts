import { JDBus } from "../../src/jdom/bus"
import JDServiceProvider from "../../src/jdom/serviceprovider"
import { EVENT, DEVICE_ANNOUNCE } from "../../src/jdom/constants"
import { loadSpecifications, mkBus } from "../testutils"

import { JDEvent } from "../../src/jdom/event"
import { JDDevice } from "../../src/jdom/device"
import JDServiceServer from "../../src/jdom/serviceserver"
import { assert } from "../../src/jdom/utils"
import { JDService } from "../../src/jdom/service"
import { FastForwardScheduler } from "../../src/jdom/scheduler"

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

// Creates a test bus, runs the test body function, and tears down the test bus.
// Bus setup should be handled within the test body
export async function withBus(test: (bus: JDBus) => Promise<void>) {
    // TODO this reimplements mkBus
    loadSpecifications()
    const scheduler = new FastForwardScheduler()
    const bus = new JDBus([], {
        scheduler: scheduler
    })

    bus.start()

    // Actually run the test here
    scheduler.stepTo(3000)  // TODO needs to be integrated with time-advancing test primitives
    await test(bus)

    bus.stop()
}

// Structure returned from createServices for each server, that contains the server passed in,
// the created device, and the service on the device corresponding to the server.
export interface CreatedServerService<ServiceType extends JDServiceServer> {
    server: ServiceType
    device: JDDevice
    service: JDService
}

// Creates devices around the given servers, specified as mapping of names to objects.
// These devices are attached to the bus, and waited on for announcement so services are ready.
// Returns the services, as an object mapping the input names to the corresponding services.
//
// For example,
// const { button } = await createServices(bus, {
//   button: new ButtonServer(),
// })
//
// button is an object containing:
// - server, the server passed in
// - device, the device on the bus created
// - service, the service on the device corresponding to the server
export async function createServices<T extends Record<string, JDServiceServer>>(
    bus: JDBus,
    servers: T
): Promise<{ [key in keyof T]: CreatedServerService<T[key]> }> {
    // attach servers to the bus as devices
    const devices = Object.entries(servers).map(([name, server]) => {
        const device = bus.addServiceProvider(new JDServiceProvider([server]))
        return {
            name: name,
            server: server,
            device: device,
        }
    })

    // wait for created devices to be announced, so services become available
    const deviceIds = devices.map(elt => elt.device.deviceId)
    await new Promise(resolve => {
        const devicesIdSet = new Set(deviceIds)
        const announcedIdSet = new Set()
        const onHandler = (device: JDDevice) => {
            console.log(`announce ${device}`)

            if (devicesIdSet.has(device.deviceId)) {
                announcedIdSet.add(device.deviceId)
            }
            if (setEquals(devicesIdSet, announcedIdSet)) {
                bus.off(DEVICE_ANNOUNCE, onHandler)
                resolve(undefined)
            }
        }
        bus.on(DEVICE_ANNOUNCE, onHandler)
    })

    // Create the output map
    const namesToServices: [string, CreatedServerService<JDServiceServer>][] =
        devices.map(({ name, server, device }) => {
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
                    device: device,
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

export interface EventWithinOptions {
    after?: number // event must happen at least this many ms after the current time (by default, 0)
    within?: number // event must happen within this many ms after the current time (by default, infinite)
    tolerance?: number // when after is set, sets the allowable range for the event to be tolerance on either side of after
    // is an error if within is set, or after is not set
}

// Waits for the next event from a service, within some time.
// If no event is triggered within the time, the promise is rejected at within time.
// TODO should events in the past be supported (negative after / within)?
export function nextEventFrom(
    service: JDService,
    eventWithin: EventWithinOptions = {}
): Promise<JDEvent> {
    let after: number, within: number
    if (eventWithin.tolerance !== undefined) {
        assert(
            eventWithin.after !== undefined,
            "tolerance must be used with after"
        )
        assert(
            eventWithin.within == undefined,
            "tolerance may not be used with within"
        )
        after = eventWithin.after - eventWithin.tolerance
        within = eventWithin.after + eventWithin.tolerance
    } else {
        after = eventWithin.after === undefined ? 0 : eventWithin.after
        within =
            eventWithin.within === undefined
                ? Number.POSITIVE_INFINITY
                : eventWithin.within
    }

    const bus = service.device.bus

    const startTimestamp = bus.timestamp
    const nextEventPromise: Promise<JDEvent> = new Promise(resolve =>
        service.once(EVENT, (event: JDEvent) => {
            resolve(event)
        })
    )

    let firstPromise: Promise<JDEvent | null>
    if (within != Number.POSITIVE_INFINITY) {
        // finite within, set a timeout
        const timeoutPromise: Promise<null> = new Promise(resolve =>
            bus.scheduler.setTimeout(() => {
                resolve(null)
            }, within)
        )
        firstPromise = Promise.race([nextEventPromise, timeoutPromise])
    } else {
        // infinite within, don't set a separate timeout
        firstPromise = nextEventPromise
    }

    return new Promise((resolve, reject) => {
        firstPromise.then(value => {
            if (value != null) {
                const elapsedTime = bus.timestamp - startTimestamp
                if (elapsedTime < after) {
                    if (eventWithin.tolerance !== undefined) {
                        reject(
                            new Error(
                                `nextEventWithin got event at ${elapsedTime} ms, before after=${after} ms (${eventWithin.after}±${eventWithin.tolerance} ms)`
                            )
                        )
                    } else {
                        reject(
                            new Error(
                                `nextEventWithin got event at ${elapsedTime} ms, before after=${after} ms`
                            )
                        )
                    }
                } else {
                    resolve(value)
                }
            } else {
                if (eventWithin.tolerance !== undefined) {
                    reject(
                        new Error(
                            `nextEventWithin timed out at within=${within} ms (${eventWithin.after}±${eventWithin.tolerance} ms)`
                        )
                    )
                } else {
                    reject(
                        new Error(
                            `nextEventWithin timed out at within=${within} ms`
                        )
                    )
                }
            }
        })
    })
}

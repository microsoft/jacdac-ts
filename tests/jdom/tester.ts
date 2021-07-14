import { JDBus } from "../../src/jdom/bus"
import JDServiceProvider from "../../src/jdom/serviceprovider"
import { EVENT, DEVICE_ANNOUNCE, REPORT_RECEIVE } from "../../src/jdom/constants"
import { mkBus } from "../testutils"

import { JDEvent } from "../../src/jdom/event"
import { JDDevice } from "../../src/jdom/device"
import RoleManager from "../../src/servers/rolemanager"
import JDServiceServer from "../../src/jdom/serviceserver"
import { assert } from "../../src/jdom/utils"
import { JDService } from "../../src/jdom/service"
import { JDRegister, jdunpack, PackedValues, Packet } from "../../src/jdom/jacdac-jdom"

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

interface ServerDevice {
    server: JDServiceServer
    roleName?: string
}

// Creates a bus with the specified servers (optionally bound to the specified roles),
// then runs the test function.
export async function withBus(
    devices: ServerDevice[],
    test: (
        bus: JDBus,
        serviceMap: Map<JDServiceServer, JDService>
    ) => Promise<void>
) {
    const bus = mkBus()

    // For server devices: add the service provider on the bus and return the device
    const serverDevices = devices.map(device => {
        const busDevice = bus.addServiceProvider(
            new JDServiceProvider([device.server])
        )
        return {
            server: device.server,
            busDevice: busDevice,
            roleName: device.roleName,
        }
    })

    bus.start()

    // Wait for created devices to be announced, so services become available
    const serverDeviceIds = serverDevices.map(elt => elt.busDevice.deviceId)
    await new Promise(resolve => {
        const devicesIdSet = new Set(serverDeviceIds)
        const announcedIdSet = new Set()
        const onHandler = (device: JDDevice) => {
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

    // Bind services to roles
    // Start by geting server service -> roleName mappings
    const serverServiceRoles = serverDevices.map(elt => {
        const services = elt.busDevice.services({
            serviceClass: elt.server.serviceClass,
        })
        assert(
            services.length > 0,
            `created device ${elt.busDevice.friendlyName} has no service of ${elt.server.specification.name}`
        )
        assert(
            services.length == 1,
            `created device ${elt.busDevice.friendlyName} has multiple service of ${elt.server.specification.name}`
        )
        return {
            service: services[0],
            roleName: elt.roleName,
        }
    })

    const roleBindings = serverServiceRoles
        .filter(
            elt => !!elt.roleName // filter for where role name is available
        )
        .map(elt => {
            return {
                role: elt.roleName,
                serviceClass: elt.service.specification.classIdentifier,
                service: elt.service,
            }
        })

    const roleManager = new RoleManager(bus)
    roleManager.setRoles(roleBindings)

    // Return created services as a map from the source server
    const serviceMap = new Map(
        serverDevices.map(elt => [
            elt.server,
            elt.busDevice.services({
                serviceClass: elt.server.serviceClass,
            })[0],
        ])
    )

    // Actually run the test here
    await test(bus, serviceMap)

    bus.stop()
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


export function nextUpdateFrom(
    register: JDRegister
): Promise<PackedValues> {
    const packFormat = register.specification.packFormat

    // TODO option timing stuff
    const nextReportPromise: Promise<PackedValues> = new Promise(resolve =>
        register.on(REPORT_RECEIVE, (packet: Packet) => {
            const unpackedData = jdunpack(packet.data, packFormat)
            resolve(unpackedData)
         })
    )

    return nextReportPromise
}

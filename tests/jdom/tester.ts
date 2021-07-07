import { JDBus } from "../../src/jdom/bus"
import JDServiceProvider from "../../src/jdom/serviceprovider"
import { EVENT, DEVICE_ANNOUNCE } from "../../src/jdom/constants";
import { mkBus } from "../testutils";

import { AdapterServer } from "../../src/servers/buttongestureadapter"
import { JDEvent } from "../../src/jdom/event";
import { JDDevice } from "../../src/jdom/device";
import RoleManager from "../../src/servers/rolemanager"
import JDServiceServer from "../../src/jdom/serviceserver";
import { assert } from "../../src/jdom/utils";
import { JDService } from "../../src/jdom/service";


// how the heck is this not a native operation
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


interface BusDevice {
    server: JDServiceServer,
    roleName?: string,
}

// Creates a bus with the specified servers, bound to the specified roles.
// Returns once all devices are registered, and adapters are ready.
// TODO should a timeout live here? or should that be a higher level responsibility?
export async function withBus(busDevices: BusDevice[], test: (bus: JDBus, serviceMap: Map<JDServiceServer, JDService>) => Promise<void>) {
    const bus = mkBus()

    const serverDeviceRoleList = busDevices.map(busDevice => {
        const device = bus.addServiceProvider(new JDServiceProvider(
            [busDevice.server]
            ))  // TODO support multi-service devices?
        return {
            server: busDevice.server,
            device: device,
            roleName: busDevice.roleName
        }
    })

    bus.start()  // TODO is this the right place to start the bus?
    console.log(`BUS BRR ${bus.backgroundRefreshRegisters}`)

    // Wait for created devices to be announced, so services become available
    // TODO is this a good way to write async code in TS?
    await new Promise(resolve => {
        const devicesSet = new Set(serverDeviceRoleList.map(elt => elt.device))
        const announcedSet = new Set()
        const onHandler = (device: JDDevice) => {
            if (devicesSet.has(device)) {
                announcedSet.add(device)
            }
            
            if (setEquals(devicesSet, announcedSet)) {
                bus.off(DEVICE_ANNOUNCE, onHandler)
                resolve(undefined)
            }
        }
        bus.on(DEVICE_ANNOUNCE, onHandler)
    })

    // Assign roles now that services are available
    const serverServiceRoleList = serverDeviceRoleList.map(elt => {
        const services = elt.device.services({serviceClass: elt.server.serviceClass})
        assert(services.length > 0, 
            `created device ${elt.device.friendlyName} has no service of ${elt.server.specification.name}`)
        assert(services.length == 1, 
            `created device ${elt.device.friendlyName} has multiple service of ${elt.server.specification.name}`)
        return {
            server: elt.server,
            service: services[0],
            roleName: elt.roleName
        }
    })

    const roleManager = new RoleManager(bus)
    roleManager.setRoles(serverServiceRoleList.filter(elt => {
        return !!elt.roleName  // filter for where role name is available
    }).map(elt => {
        // TODO role manager doesn't allow manual specificiation of binding role => services right now,
        // it's greedily / automatically allocated.
        // When manual specification is added this needs to perform that binding.
        // For now this just allocates a role and type.
        // IF YOU HAVE MORE THAN ONE SERVICE INSTANCE WEIRD THINGS CAN HAPPEN!
        return {role: elt.roleName, serviceShortId: elt.service.specification.shortId}
    }))

    // TODO this is (might be?) a nasty hack to associate a particular service with a role name
    serverServiceRoleList.map(elt => {
        elt.service.role = elt.roleName
    })

    
    // Wait for adapters to be ready
    // TODO WRITE ME
    // Give adapters a role manager, so they can find underlying services
    // TODO HACK HACK HACK
    serverServiceRoleList.forEach(elt => {
        if (elt.server instanceof AdapterServer) {
            elt.server._hack_setRoleManager(roleManager)
        }
    })


    // Return created services as a map from the source server
    const serviceMap = new Map(
        serverServiceRoleList.map(elt => {
            return [elt.server, elt.service]
        })
    )

    console.log(`BUS BRR ${bus.backgroundRefreshRegisters}`)

    await test(bus, serviceMap)

    bus.stop()
}

interface EventWithinOptions {
    after?: number
    within?: number
}

export class JDBusTestUtil {
    // TODO should this also encapsulate the serviceMap?
    constructor(protected readonly bus: JDBus) {
    }

    // Waits for the next event from a service, and returns the event.
    // The event must not have triggered already.
    // TODO track prior events?
    public nextEventFrom(service: JDService): Promise<JDEvent> {
        return new Promise(resolve => service.once(EVENT, (event: JDEvent) => {
            resolve(event)
        }))
    }



    // Waits for the next event from a service, within some time.
    // If no event is triggered within the time, the promise is rejected at within time.
    // TODO support events in the past (negative timestamp?)
    public nextEventWithin(service: JDService,
        eventWithin: EventWithinOptions = {}): Promise<JDEvent> {
        const after = (eventWithin.after === undefined) ? 0 : eventWithin.after
        const within = (eventWithin.within === undefined) ? Number.POSITIVE_INFINITY : eventWithin.within

        // TODO check for code somewhere?
        const startTimestamp = this.bus.timestamp
        const nextEventPromise: Promise<JDEvent> = new Promise(resolve => 
            service.once(EVENT, (event: JDEvent) => { resolve(event) }
        ))
        
        let firstPromise: Promise<JDEvent | null>
        if (within != Number.POSITIVE_INFINITY) {  // finite within, set a timeout
            const timeoutPromise: Promise<null> = new Promise(resolve => 
                this.bus.scheduler.setTimeout(() => { resolve(null) }, within))
            firstPromise = Promise.race([
                nextEventPromise,
                timeoutPromise
            ])
        } else {  // infinite within, don't set a separate timeout
            firstPromise = nextEventPromise
        }

        return new Promise((resolve, reject) => {
            firstPromise.then(value => {
                if (value != null) {
                    const elapsedTime = this.bus.timestamp - startTimestamp
                    if (elapsedTime < after) {
                        reject(new Error(`nextEventWithin got event at ${elapsedTime} ms, before after=${after} ms`))
                    } else {
                        resolve(value)
                    }
                    
                } else {
                    reject(new Error(`nextEventWithin timed out at within=${within} ms`))
                }
            })
           
        })
    }
}

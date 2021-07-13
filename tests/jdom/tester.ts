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
import { parseTrace } from "../../src/jdom/logparser";
import * as fs from 'fs';
import { shortDeviceId } from "../../src/jdom/jacdac-jdom";
import Trace from "../../src/jdom/trace";


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


export class TraceServer {
    readonly trace: Trace
    readonly deviceId: string  // the full device id, from the packet in the trace

    protected nextPacketIndex: number
    protected bus: JDBus
    protected stopped = false

    constructor(traceFilename: string, readonly shortId: string) {
        const traceRaw = parseTrace(fs.readFileSync(traceFilename, "utf-8").toString())

        const filteredPackets = traceRaw.packets.filter(packet => {
            return shortDeviceId(packet.deviceIdentifier) == shortId
        })
        assert(filteredPackets.length > 0, "no packets from device")
        assert(filteredPackets[0].isAnnounce, "first packet from device in trace must be announce")
        this.deviceId = filteredPackets[0].deviceIdentifier

        // TODO how would retiming work with multiple devices?
        // TODO should retiming be optional?
        const retimedPackets = filteredPackets.map(packet => {  // announce at t=0
            const clone = packet.clone()
            clone.timestamp = clone.timestamp - filteredPackets[0].timestamp
            return clone
        })
        this.trace = new Trace(retimedPackets, traceRaw.description)

        assert(this.trace !== undefined, `failed to create trace from ${traceFilename}`)
    }

    // Called when the next packet is ready to be processed, processes it, and schedules the packet afterwards
    // (if not at end).
    protected nextPacket() {
        if (this.stopped) {
            return  // nop, don't schedule future events
        }

        while (this.nextPacketIndex < this.trace.packets.length
            && this.trace.packets[this.nextPacketIndex].timestamp <= this.bus.timestamp) {
            // replay code from TracePlayer.tick()
            const pkt = this.trace.packets[this.nextPacketIndex].clone()
            pkt.replay = true
            this.bus.processPacket(pkt)

            this.nextPacketIndex++
        }

        if (this.nextPacketIndex < this.trace.packets.length) {
            this.bus.scheduler.setTimeout(() => {
                this.nextPacket()
            }, this.trace.packets[this.nextPacketIndex].timestamp - this.bus.timestamp)
        }
    }

    public start(bus: JDBus) {
        assert(this.nextPacketIndex == undefined, "can't restart trace device")
        this.nextPacketIndex = 0
        this.bus = bus

        bus.scheduler.setTimeout(() => {
            this.nextPacket()
        }, 0)
    }

    // Stops the trace device.
    // May only be called after start() has been called, and only once.
    // May be called after packets have drained (effective a nop).
    public stop() {
        assert(this.nextPacketIndex != undefined, "can't stop unstarted trace device")
        assert(!this.stopped, "trace device already stopped")
        this.stopped = true
    }
}

interface TraceDevice {
    trace: TraceServer,
    service: number,
    roleName: string,
}


interface ServerDevice {
    server: JDServiceServer,
    roleName?: string,
}

function isTraceDevice(obj: ServerDevice | TraceDevice): obj is TraceDevice {
    return 'trace' in obj
}

function isServerDevice(obj: ServerDevice | TraceDevice): obj is ServerDevice {
    return 'server' in obj
}


// Creates a bus with the specified servers, bound to the specified roles.
// Returns once all devices are registered, and adapters are ready.
// TODO should a timeout live here? or should that be a higher level responsibility?
export async function withBus(devices: (ServerDevice | TraceDevice)[], 
    test: (bus: JDBus, serviceMap: Map<JDServiceServer, JDService>) => Promise<void>) {
    const bus = mkBus()

    // For server devices: add the service provider on the bus and return the device
    const serverDevices = devices.filter(device => {
        return isServerDevice(device)
    }).map(device => {
        const busDevice = bus.addServiceProvider(new JDServiceProvider(
            [(<ServerDevice>device).server] 
        ))
        return {
            server: (<ServerDevice>device).server,
            busDevice: busDevice,
            roleName: (<ServerDevice>device).roleName,
        }
    })

    // For trace devices: start the device on the bus
    const traceDevices = devices.filter(device => {
        return isTraceDevice(device)
    }).map(device => {
        (<TraceDevice>device).trace.start(bus)
        return <TraceDevice>device
    })


    bus.start()  // TODO is this the right place to start the bus?

    // Map device IDs to listen for, so we can get a bus device from the traces
    const traceDeviceIds = traceDevices.map(elt => {
        return elt.trace.deviceId
    })
    const deviceIdToDeviceMap = new Map<string, JDDevice>()  // deviceId -> bus JDDevice

    // Wait for created devices to be announced, so services become available
    // TODO this advances bus time, including replay packets. Is this a good idea?
    const serverDeviceIds = serverDevices.map(elt => {
        return elt.busDevice.deviceId
    })
    await new Promise(resolve => {
        const devicesIdSet = new Set(traceDeviceIds.concat(serverDeviceIds))
        const announcedIdSet = new Set()
        const onHandler = (device: JDDevice) => {
            deviceIdToDeviceMap.set(device.deviceId, device)

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
    // Get server service -> roleName mappings
    const serverServiceRoles = serverDevices.map(elt => {
        const services = elt.busDevice.services({serviceClass: elt.server.serviceClass})
        assert(services.length > 0, 
            `created device ${elt.busDevice.friendlyName} has no service of ${elt.server.specification.name}`)
        assert(services.length == 1, 
            `created device ${elt.busDevice.friendlyName} has multiple service of ${elt.server.specification.name}`)
        return {
            service: services[0],
            roleName: elt.roleName
        }
    })
    // Get trace service -> roleName mappings
    const traceServiceRoles = traceDevices.map(elt => {
        assert(deviceIdToDeviceMap.has(elt.trace.deviceId), `missing trace ${elt.trace.deviceId} in map of ${deviceIdToDeviceMap.keys()}`)
        const busDevice = deviceIdToDeviceMap.get(elt.trace.deviceId)
        const services = busDevice.services({serviceClass: elt.service})
        assert(services.length > 0, 
            // TODO needs better debug output instead of service number
            `created trace device ${busDevice.friendlyName} has no service of ${elt.service}`)
        assert(services.length == 1, 
            `created trace device ${busDevice.friendlyName} has multiple service of ${elt.service}`)
        return {
            service: services[0],
            roleName: elt.roleName
        }
    })
    const roleBindings = serverServiceRoles.concat(traceServiceRoles).filter(elt => {
        return !!elt.roleName  // filter for where role name is available
    }).map(elt => {
        return {
            role: elt.roleName, 
            serviceClass: elt.service.specification.classIdentifier,
            service: elt.service,
        }
    })

    const roleManager = new RoleManager(bus)
    roleManager.setRoles(roleBindings)

    // Give adapters a role manager, so they can find underlying services
    // TODO HACK HACK HACK
    serverDevices.forEach(elt => {
        if (elt.server instanceof AdapterServer) {
            elt.server._hack_setRoleManager(roleManager)
        }
    })

    // Return created services as a map from the source server
    // Trace devices are ignored here, since handles aren't (currently?) useful
    const serviceMap = new Map(
        serverDevices.map(elt => {
            return [elt.server, elt.busDevice.services({serviceClass: elt.server.serviceClass})[0]]
        })
    )

    // Actually run the test here
    await test(bus, serviceMap)

    traceDevices.forEach(trace => {
        trace.trace.stop()
    })

    bus.stop()
}

interface EventWithinOptions {
    after?: number  // event must happen at least this many ms after the current time (by default, 0)
    within?: number  // event must happen within this many ms after the current time (by default, infinite)
    tolerance?: number  // when after is set, sets the allowable range for the event to be tolerance on either side of after
                        // is an error if within is set, or after is not set
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
    public nextEventWithin(service: JDService, eventWithin: EventWithinOptions = {}): Promise<JDEvent> {
        let after: number, within: number
        if (eventWithin.tolerance !== undefined) {
            assert(eventWithin.after !== undefined, "tolerance must be used with after")
            assert(eventWithin.within == undefined, "tolerance may not be used with within")
            after = eventWithin.after - eventWithin.tolerance
            within = eventWithin.after + eventWithin.tolerance
        } else {
            after = (eventWithin.after === undefined) ? 0 : eventWithin.after
            within = (eventWithin.within === undefined) ? Number.POSITIVE_INFINITY : eventWithin.within
        }

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
                        if (eventWithin.tolerance !== undefined) {
                            reject(new Error(`nextEventWithin got event at ${elapsedTime} ms, before after=${after} ms (${eventWithin.after}±${eventWithin.tolerance} ms)`))
                        } else {
                            reject(new Error(`nextEventWithin got event at ${elapsedTime} ms, before after=${after} ms`))
                        }
                    } else {
                        resolve(value)
                    }
                } else {
                    if (eventWithin.tolerance !== undefined) {
                        reject(new Error(`nextEventWithin timed out at within=${within} ms (${eventWithin.after}±${eventWithin.tolerance} ms)`))
                    } else {
                        reject(new Error(`nextEventWithin timed out at within=${within} ms`))
                    }
                }
            })
    
        })
    }
}

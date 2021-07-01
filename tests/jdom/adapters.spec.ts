import { suite, test, afterEach } from "mocha"
import { JDBus } from "../../src/jdom/bus"
import JDServiceProvider from "../../src/jdom/serviceprovider"
import { EVENT, SRV_BUTTON, SRV_BUTTON_GESTURE, DEVICE_ANNOUNCE, ROLE_BOUND } from "../../src/jdom/constants";
import { mkBus } from "../testutils";

import ButtonGestureAdapter, { AdapterServer } from "../../src/servers/buttongestureadapter"
import ButtonServer from "../../src/servers/buttonserver"
import { JDEvent } from "../../src/jdom/event";
import { JDDevice } from "../../src/jdom/device";
import RoleManager from "../../src/servers/rolemanager"
import JDServiceServer from "../../src/jdom/serviceserver";
import { assert } from "../../src/jdom/utils";
import { JDService } from "../../src/jdom/service";
import { RoleManagerClient } from "../../src/jdom/rolemanagerclient";
import { instanceOf } from "prop-types";

interface BusDevice {
    server: JDServiceServer,
    roleName?: string,
}

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

// Creates a bus with the specified servers, bound to the specified roles.
// Returns once all devices are registered, and adapters are ready.
// TODO should a timeout live here? or should that be a higher level responsibility?
async function createBus(busDevices: BusDevice[]): Promise<[JDBus, Map<JDServiceServer, JDService>]> {
    const bus = mkBus()

    const serverDeviceRoleList: [JDServiceServer, JDDevice, string?][] = busDevices.map(busDevice => {
        const device = bus.addServiceProvider(new JDServiceProvider(
            [busDevice.server]
            ))  // TODO support multi-service devices?
        return [busDevice.server, device, busDevice.roleName]
    })

    // Wait for created devices to be announced, so services become available
    // TODO is this a good way to write async code in TS?
    await new Promise(resolve => {
        const devicesSet = new Set(serverDeviceRoleList.map(serviceDevice => serviceDevice[1]))
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
    const serverServiceRoleList: [JDServiceServer, JDService, string][] = serverDeviceRoleList.filter(([server, device, roleName]) => {
        return !!roleName  // filter for where role name is availab;e
    }).map(([server, device, roleName]) => {
        const services = device.services({serviceClass: server.serviceClass})
        assert(services.length > 0, `created device ${device.friendlyName} has no service of ${server.specification.name}`)
        assert(services.length == 1, `created device ${device.friendlyName} has multiple service of ${server.specification.name}`)
        return [server, services[0], roleName]
    })

    const roleManager = new RoleManager(bus)
    roleManager.setRoles(serverServiceRoleList.map(([server, service, roleName]) => {
        // TODO role manager doesn't allow manual specificiation of binding role => services right now,
        // it's greedily / automatically allocated.
        // When manual specification is added this needs to perform that binding.
        // For now this just allocates a role and type.
        // IF YOU HAVE MORE THAN ONE SERVICE INSTANCE WEIRD THINGS CAN HAPPEN!
        return {role: roleName, serviceShortId: service.specification.shortId}
    }))

    // TODO this is (might be?) a nasty hack to associate a particular service with a role name
    serverServiceRoleList.map(([server, service, roleName]) => {
        service.role = roleName
    })

    // TODO HACK HACK HACK
    // Give adapters a role manager, so they can find underlying services
    // use serverDeviceRoleList before it doesn't filter by requiring role name
    serverDeviceRoleList.forEach(([server, device, roleName]) => {
        if (server instanceof AdapterServer) {
            server._hack_setRoleManager(roleManager)
        }
    })

    // Ensure adapters are ready
    // TODO WRITE ME

    // Return created services as a map from the source server
    const serverServiceMap = new Map(
        serverServiceRoleList.map(([server, service, roleName]) => {
            return [server, service]
        })
    )

    return [bus, serverServiceMap]
}

suite('adapters', () => {
    let bus: JDBus;

    afterEach(() => bus?.stop())

    test('click detect event', async function() {
        console.log("start test")

        // These are here so we have a handle
        const buttonServer = new ButtonServer("button")  // interface name is just a human-friendly name, not functional
        const gestureAdapter = new ButtonGestureAdapter("button", "gestureAdapter")
        let serviceMap: Map<JDServiceServer, JDService>
        [bus, serviceMap] = await createBus([
            {server: buttonServer, roleName: "button"},
            {server: gestureAdapter},
        ])
        console.log("bus created")

        serviceMap[buttonServer].on(EVENT, (ev: JDEvent) => {  // TODO make sure we're expecting the right events
            console.log(`SRV_BUTTON ${ev.parent.friendlyName}  ${ev.name}  ${ev.code}`)
        })

        // bus.services({serviceClass: SRV_BUTTON}).forEach(buttonService => {
        //     buttonService
        // })

        bus.services({serviceClass: SRV_BUTTON_GESTURE}).forEach(buttonService => {
            buttonService.on(EVENT, (ev: JDEvent) => {  // TODO make sure we're expecting the right events
                console.log(`SRV_BUTTON_GESTURE ${ev.parent.friendlyName}  ${ev.name}  ${ev.code}`)
            })
        })

        // Simple test stimulus, click cycle
        await bus.delay(300)
        buttonServer.down()
        await bus.delay(100)
        buttonServer.up()  // should generate click event

        await bus.delay(300)

        // Test stimulus, click and hold cycle
        buttonServer.down()  // should generate click-and-hold event
        await bus.delay(300)
        buttonServer.up()  // and release event
        await bus.delay(100)

        console.log("done")
    })
});

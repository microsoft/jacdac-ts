import { suite, test, afterEach } from "mocha"
import { JDBus } from "../../src/jdom/bus"
import JDServiceProvider from "../../src/jdom/serviceprovider"
import { EVENT, SRV_BUTTON, SRV_BUTTON_GESTURE, DEVICE_ANNOUNCE, ROLE_BOUND } from "../../src/jdom/constants";
import { mkBus } from "../testutils";

import ButtonGestureAdapter from "../../src/servers/buttongestureadapter"
import ButtonServer from "../../src/servers/buttonserver"
import { JDEvent } from "../../src/jdom/event";
import { JDDevice } from "../../src/jdom/device";
import RoleManager from "../../src/servers/rolemanager"
import JDServiceServer from "../../src/jdom/serviceserver";
import { assert } from "../../src/jdom/utils";
import { JDService } from "../../src/jdom/service";

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
async function createBus(busDevices: BusDevice[]): Promise<JDBus> {
    const bus = mkBus()

    const serverDeviceRoleList: [JDServiceServer, JDDevice, string?][] = busDevices.map(busDevice => {
        const device = bus.addServiceProvider(new JDServiceProvider(
            [busDevice.server]
            ))  // TODO support multi-service devices?
        return [busDevice.server, device, busDevice.roleName]
    })

    // Wait for created devices to be announced, so services become available
    // TODO is this a good way to write async code in TS?
    await new Promise((resolve, reject) => {
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
    const roleNameToService: [string, JDService][] = serverDeviceRoleList.filter(([server, device, role]) => {
        return !!role  // filter for where role name is availab;e
    }).map(([server, device, role]) => {
        const services = device.services({serviceClass: server.serviceClass})
        assert(services.length > 0, `created device ${device.friendlyName} has no service of ${server.specification.name}`)
        assert(services.length == 1, `created device ${device.friendlyName} has multiple service of ${server.specification.name}`)
        return [role, services[0]]
    })

    bus.on(ROLE_BOUND, (role: string) => {
        console.log(`role bound ${role}`)
    })


    // TODO does this just work?!
    roleNameToService.map(([roleName, service]) => {
        service.role = roleName
    })

    // const roleManager = new RoleManager(bus)
    // roleManager.setRoles(roleNameToService.map(([roleName, service]) => {
    //     return (roleName, service)
    // }))


    // Ensure adapters are ready
    // TODO WRITE ME

    // TODO return devices as map?
    return bus
}

suite('adapters', () => {
    let bus: JDBus;

    afterEach(() => bus?.stop())

    test('click detect event', async function() {
        console.log("start test")

        // These are here so we have a handle
        const buttonServer = new ButtonServer("button")  // interface name is just a human-friendly name, not functional
        const gestureAdapter = new ButtonGestureAdapter("button", "gestureAdapter")

        bus = await createBus([
            {server: buttonServer, roleName: "button"},
            {server: gestureAdapter},
        ])
        console.log("bus created")

        bus.services({serviceClass: SRV_BUTTON}).forEach(buttonService => {
            console.log(`on SRV_BUTTON  ${buttonService.friendlyName}`)
            buttonService.on(EVENT, (evs: JDEvent[]) => {  // TODO make sure we're expecting the right events
                console.log(`SRV_BUTTON ${evs[0].parent.friendlyName}  ${evs[0].name}  ${evs[0].code}`)
            })
        })

        bus.services({serviceClass: SRV_BUTTON_GESTURE}).forEach(buttonService => {
            console.log(`on SRV_BUTTON_GESTURE  ${buttonService.friendlyName}`)
            buttonService.on(EVENT, (evs: JDEvent[]) => {  // TODO make sure we're expecting the right events
                console.log(`SRV_BUTTON_GESTURE ${evs[0].parent.friendlyName}  ${evs[0].name}  ${evs[0].code}`)
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

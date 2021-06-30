import { suite, test, afterEach } from "mocha"
import { JDBus } from "../../src/jdom/bus"
import JDServiceProvider from "../../src/jdom/serviceprovider"
import { EVENT, SRV_BUTTON, SRV_BUTTON_GESTURE, DEVICE_ANNOUNCE } from "../../src/jdom/constants";
import { mkBus } from "../testutils";

import ButtonGestureAdapter from "../../src/servers/buttongestureadapter"
import ButtonServer from "../../src/servers/buttonserver"
import { JDEvent } from "../../src/jdom/event";
import { JDDevice } from "../../src/jdom/device";
import RoleManager from "../../src/servers/rolemanager"
import JDServiceServer from "../../src/jdom/serviceserver";

interface BusDevice {
    server: JDServiceServer,
    roleName?: string,
}

// Creates a bus with the specified servers, bound to the specified files.
// Returns once all devices are registered, and adapters are ready.
async function createBus(busDevices: BusDevice[]): Promise<JDBus> {
    const bus = mkBus()
    const roleManager = new RoleManager(bus)

    const createdDevices = busDevices.forEach(busDevice => {
        const device = bus.addServiceProvider(new JDServiceProvider(
            [busDevice.server]
            ))  // TODO support multi-service devices?
        return device
    })

    // Wait for created devices to be announced, so services become available
    // TODO is this a good way to write async code in TS?
    await new Promise((resolve, reject) => {
        const onHandler = (device: JDDevice) => {
            // TODO handler logic here
            console.log(`announce ${device.describe()} => ${device.services().map(service => service.specification.name)}`)

            bus.off(DEVICE_ANNOUNCE, onHandler)
            resolve(undefined)
        }
        bus.on(DEVICE_ANNOUNCE, onHandler)
    })

    // Ensure adapters are ready
    // TODO WRITE ME

    return bus
}

suite('adapters', () => {
    let bus: JDBus;

    afterEach(() => bus?.stop())

    test('click detect event', async function(done) {
        console.log("start test")

        // These are here so we have a handle
        const buttonServer = new ButtonServer("button")  // interface name is just a human-friendly name, not functional
        // TODO pending role name refactor
        // const gestureAdapter = new ButtonGestureAdapter("button", "gestureAdapter")

        bus = await createBus([
            {server: buttonServer, roleName: "button"},
            // {server: gestureAdapter},
        ])
        console.log("bus created")

        const roleManager = new RoleManager(bus)

        bus.on(DEVICE_ANNOUNCE, (device: JDDevice) => {
            // When the button is connected, setup the button adapter and queue test stimulus
            if (device.services({serviceClass: SRV_BUTTON}).length) {
                const button = bus.services({serviceClass: SRV_BUTTON})[0]  // TODO more robust to make sure we're getting the right button
                const buttonAdapter = new ButtonGestureAdapter(button, "BG0")
                bus.addServiceProvider(new JDServiceProvider([buttonAdapter]))

                // Simple test stimulus, click cycle
                setTimeout(() => { buttonServer.down() }, 300)
                setTimeout(() => { buttonServer.up() }, 400)  // should generate click event

                // Test stimulus, click and hold cycle
                setTimeout(() => { buttonServer.down() }, 700)  // should generate click-and-hold event
                setTimeout(() => { buttonServer.up() }, 1000)  // and release event
                setTimeout(() => { done() }, 1200)
            }

            // When the adapter is connected, set up the event handler and dump events
            if (device.services({serviceClass: SRV_BUTTON_GESTURE}).length) {
                const buttonGesture = bus.services({serviceClass: SRV_BUTTON_GESTURE})[0]

                let eventCounts = 0
                buttonGesture.on(EVENT, (evs: JDEvent[]) => {  // TODO make sure we're expecting the right events
                    console.log(`${evs[0].name}  ${evs[0].code}`)

                    eventCounts += 1  // TODO do something with this! Some kind of expect?
                })
            }
        })

    })
});

import { suite, test, afterEach } from "mocha"
import { JDBus } from "../../src/jdom/bus"
import JDServiceProvider from "../../src/jdom/serviceprovider"
import { EVENT, SRV_BUTTON, SRV_BUTTON_GESTURE, DEVICE_ANNOUNCE } from "../../src/jdom/constants";
import { mkBus } from "../testutils";

import ButtonGestureAdapter from "../../src/servers/buttongestureadapter"
import ButtonServer from "../../src/servers/buttonserver"
import { JDEvent } from "../../src/jdom/event";
import { JDDevice } from "../../src/jdom/device";

suite('bus', () => {
    let bus: JDBus;

    afterEach(() => bus?.stop())

    test('self announce', function(done) {
        console.log("start test")
        bus = mkBus();
        console.log("bus created")

        const options = {  // no idea what this does, cargo-culting from servers.ts
            resetIn: false,
        }
        const buttonServer = new ButtonServer("B0")  // TODO does the name do anything?
        bus.addServiceProvider(new JDServiceProvider([buttonServer], options))

        bus.on(DEVICE_ANNOUNCE, (device: JDDevice) => {
            const servicesNames = device.services().map(service => service.specification.classIdentifier)

            // When the button is connected, setup the button adapter and queue test stimulus
            if (servicesNames.includes(SRV_BUTTON)) {
                const button = bus.services({serviceClass: SRV_BUTTON})[0]
                const buttonAdapter = new ButtonGestureAdapter(button, "BG0")
                bus.addServiceProvider(new JDServiceProvider([buttonAdapter], options))

                // Simple test stimulus, click cycle
                setTimeout(() => { buttonServer.down() }, 500)
                setTimeout(() => { buttonServer.up() }, 750)
            }

            // When the adapter is connected, set up the event handler and dump events
            if (servicesNames.includes(SRV_BUTTON_GESTURE)) {
                const buttonGesture = bus.services({serviceClass: SRV_BUTTON_GESTURE})[0]
                
                let eventCounts = 0
                buttonGesture.on(EVENT, (evs: JDEvent[]) => {
                    // console.log(evs)
                    console.log(evs[0].code)
                    console.log(evs[0].name)

                    eventCounts += 1
                    if (eventCounts >= 2) {
                        done()
                    }
                })
            }
        })

    })
});

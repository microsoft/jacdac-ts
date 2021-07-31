// Test the ButtonServer, intended as a test for the unit test framework.
// Yes, we're meta-testing!

import { suite, test } from "mocha"
import { ButtonEvent, ButtonReg } from "../../src/jdom/constants"
import { withTestBus, createServices, nextEventFrom } from "./tester"
import { assert } from "../../src/jdom/utils"
import ButtonServer from "../../src/servers/buttonserver"
import { ServiceTester } from "../../src/tstester/servicewrapper"
import { FastForwardBusTester, FastForwardTestDriver } from "./newtester"

suite("button server", () => {
    // Tolerances are set to 50ms as a typical register update interval
    test("fires edge events after changing state", async function () {
        await FastForwardBusTester.withTestBus(async bus => {
            const { button } = await bus.createServices({
                button: new ButtonServer("button", false),
            })
            const driver = new FastForwardTestDriver(bus.bus)
            const service = new ServiceTester(button.service)
            const register = service.register(ButtonReg.Pressure)

            button.server.down() // TODO does this run the risk of firing the event immediately?
            await driver.waitForAll(
                [
                    service.onEvent(ButtonEvent.Down).hold(),
                    register
                        .onUpdate({
                            preRequiredRange: [0, 0.5],
                            triggerRange: [0.5, 1],
                        })
                        .hold(),
                ],
                { within: 50, synchronization: 50 }
            )
            driver.log("saw down")

            button.server.up()
            await driver.waitForAll(
                [
                    service.nextEvent(ButtonEvent.Up).hold(),
                    register
                        .onUpdate({
                            preRequiredRange: [0.5, 1],
                            triggerRange: [0, 0.5],
                        })
                        .hold(),
                ],
                { within: 50, synchronization: 50 }
            )
            driver.log("saw up")
        })
    })
})

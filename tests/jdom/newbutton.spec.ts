// Test the ButtonServer, intended as a test for the unit test framework.
// Yes, we're meta-testing!

import { suite, test } from "mocha"
import { ButtonEvent, ButtonReg } from "../../src/jdom/constants"
import { withTestBus, createServices, nextEventFrom } from "./tester"
import { assert } from "../../src/jdom/utils"
import ButtonServer from "../../src/servers/buttonserver"
import { ServiceTester } from "../../src/tstester/servicewrapper"

suite("button server", () => {
    // Note that tolerances are set at 60 ms here, because the button updates on a handleRefresh,
    // which runs every 50ms. So it's possible here for the handleRefresh to run before the stimulus,
    // which adds a 50ms delay.
    test("fires edge events after changing state", async function () {
        await withTestBus(async bus => {
            const { button } = await createServices(bus, {
                button: new ButtonServer("button", false),
            })

            button.server.down()

            const service = new ServiceTester(button.service)
            const register = service.register(ButtonReg.Pressure)    

            await this.driver.waitForAll(
                [
                    service.onEvent(ButtonEvent.Down).hold(),
                    register
                        .onUpdate({
                            preRequiredRange: [0, 0.5],
                            triggerRange: [0.5, 1],
                        })
                        .hold(),
                ],
                { synchronization: 50 }
            )
            this.driver.log("saw down")
            button.server.up()

            await this.driver.waitForAll(
                [
                    service.nextEvent(ButtonEvent.Up).hold(),
                    register
                        .onUpdate({
                            preRequiredRange: [0.5, 1],
                            triggerRange: [0, 0.5],
                        })
                        .hold(),
                ],
                { within: 500, synchronization: 50 }
            )
        })
    })
}
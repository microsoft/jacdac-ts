// Test the ButtonServer, intended as a test for the unit test framework.
// Yes, we're meta-testing!

import { suite, test } from "mocha"
import { ButtonEvent } from "../../src/jdom/constants"
import { withTestBus, createServices, nextEventFrom } from "./tester"
import { assert } from "../../src/jdom/utils"
import ButtonServer from "../../src/servers/buttonserver"

suite("button server", () => {
    // Note that tolerances are set at 110 ms here, because the button updates on a handleRefresh,
    // which runs every 500ms. So it's possible here for the handleRefresh to run before the stimulus
    // (adding a 50ms delay), then the test timeout (were it set to 100ms) to happen right before
    // handleRefresh fires and fail the test.
    test("fires edge events after changing state", async function () {
        await withTestBus(async bus => {
            const { button } = await createServices(bus, {
                button: new ButtonServer("button", false),
            })

            button.server.down()
            assert(
                (await nextEventFrom(button.service, { within: 110 })).code ==
                    ButtonEvent.Down
            )

            button.server.up()
            assert(
                (await nextEventFrom(button.service, { within: 110 })).code ==
                    ButtonEvent.Up
            )
        })
    })

    test("fires both down and hold events when held", async function () {
        await withTestBus(async bus => {
            const { button } = await createServices(bus, {
                button: new ButtonServer("button", false),
            })

            button.server.down()
            assert(
                (await nextEventFrom(button.service, { within: 110 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(button.service, {
                        after: 500,
                        tolerance: 110,
                    })
                ).code == ButtonEvent.Hold
            )
        })
    })

    test("repeatedly raise hold events when held", async function () {
        await withTestBus(async bus => {
            const { button } = await createServices(bus, {
                button: new ButtonServer("button", false),
            })

            button.server.down()
            assert(
                (await nextEventFrom(button.service, { within: 110 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(button.service, {
                        after: 500,
                        tolerance: 110,
                    })
                ).code == ButtonEvent.Hold
            )
            assert(
                (
                    await nextEventFrom(button.service, {
                        after: 500,
                        tolerance: 110,
                    })
                ).code == ButtonEvent.Hold
            )

            button.server.up()
            assert(
                (await nextEventFrom(button.service, { within: 110 })).code ==
                    ButtonEvent.Up
            )
            await nextEventFrom(button.service, { within: 1000 }).then(
                () => {
                    assert(false, "got event from button after release")
                },
                () => {}
            ) // rejection is the expected case and nothing happens there
        })
    })

    test("detects repeated holds", async function () {
        await withTestBus(async bus => {
            const { button } = await createServices(bus, {
                button: new ButtonServer("button", false),
            })

            button.server.down()
            assert(
                (await nextEventFrom(button.service, { within: 110 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(button.service, {
                        after: 500,
                        tolerance: 110,
                    })
                ).code == ButtonEvent.Hold
            )

            button.server.up()
            assert(
                (await nextEventFrom(button.service, { within: 110 })).code ==
                    ButtonEvent.Up
            )

            button.server.down()
            assert(
                (await nextEventFrom(button.service, { within: 110 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(button.service, {
                        after: 500,
                        tolerance: 110,
                    })
                ).code == ButtonEvent.Hold
            )
        })
    })
})

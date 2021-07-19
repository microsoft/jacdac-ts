// Test the ButtonServer, intended as a test for the unit test framework.
// Yes, we're meta-testing!

import { suite, test } from "mocha"
import { ButtonEvent } from "../../src/jdom/constants"
import { withBus, createServices, nextEventFrom } from "./tester"
import { assert } from "../../src/jdom/utils"
import ButtonServer from "../../src/servers/buttonserver"

suite("button server", () => {
    test("fires edge events after changing state", async function () {
        await withBus(async bus => {
            const { button } = await createServices(bus, {
                button: new ButtonServer("button", false),
            })

            button.server.down()
            assert(
                (await nextEventFrom(button.service, { within: 100 })).code ==
                    ButtonEvent.Down
            )

            button.server.up()
            assert(
                (await nextEventFrom(button.service, { within: 100 })).code ==
                    ButtonEvent.Up
            )
        })
    })

    test("fires both down and hold events when held", async function () {
        await withBus(async bus => {
            const { button } = await createServices(bus, {
                button: new ButtonServer("button", false),
            })

            button.server.down()
            assert(
                (await nextEventFrom(button.service, { within: 100 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(button.service, {
                        after: 500,
                        tolerance: 100,
                    })
                ).code == ButtonEvent.Hold
            )
        })
    })

    test("repeatedly raise hold events when held", async function () {
        await withBus(async bus => {
            const { button } = await createServices(bus, {
                button: new ButtonServer("button", false),
            })

            button.server.down()
            assert(
                (await nextEventFrom(button.service, { within: 100 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(button.service, {
                        after: 500,
                        tolerance: 100,
                    })
                ).code == ButtonEvent.Hold
            )
            assert(
                (
                    await nextEventFrom(button.service, {
                        after: 500,
                        tolerance: 100,
                    })
                ).code == ButtonEvent.Hold
            )

            button.server.up()
            assert(
                (await nextEventFrom(button.service, { within: 100 })).code ==
                    ButtonEvent.Up
            )
            await nextEventFrom(button.service, { within: 1000 }).then(
                () => {
                    assert(false, "got event from button after release")
                },
                () => {}
            ) // rejection is the expected case and nothing happens there
        })
    }).timeout(3000) // TODO remove when we can fast-forward tests

    test("detects repeated holds", async function () {
        await withBus(async bus => {
            const { button } = await createServices(bus, {
                button: new ButtonServer("button", false),
            })

            button.server.down()
            assert(
                (await nextEventFrom(button.service, { within: 100 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(button.service, {
                        after: 500,
                        tolerance: 100,
                    })
                ).code == ButtonEvent.Hold
            )

            button.server.up()
            assert(
                (await nextEventFrom(button.service, { within: 100 })).code ==
                    ButtonEvent.Up
            )

            button.server.down()
            assert(
                (await nextEventFrom(button.service, { within: 100 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(button.service, {
                        after: 500,
                        tolerance: 100,
                    })
                ).code == ButtonEvent.Hold
            )
        })
    })
})

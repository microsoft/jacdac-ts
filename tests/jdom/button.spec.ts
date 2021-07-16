// Test the ButtonServer, intended as a test for the unit test framework.
// Yes, we're meta-testing!

import { suite, test } from "mocha"
import { ButtonEvent } from "../../src/jdom/constants"
import { withBus, createServices, nextEventFrom } from "./tester"
import { assert } from "../../src/jdom/utils"
import ButtonServer from "../../src/servers/buttonserver"

suite("button server", () => {
    test("fires edge events after changing state", async function () {
        const buttonServer = new ButtonServer("button", false)

        await withBus(async bus => {
            const {button} = await createServices(bus, {button: buttonServer})

            buttonServer.down()
            assert(
                (await nextEventFrom(button, { within: 100 })).code ==
                    ButtonEvent.Down
            )

            buttonServer.up()
            assert(
                (await nextEventFrom(button, { within: 100 })).code ==
                    ButtonEvent.Up
            )
        })
    })

    test("fires both down and hold events when held", async function () {
        const buttonServer = new ButtonServer("button", false)

        await withBus(async bus => {
            const {button} = await createServices(bus, {button: buttonServer})

            buttonServer.down()
            assert(
                (await nextEventFrom(button, { within: 100 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(button, {
                        after: 500,
                        tolerance: 100,
                    })
                ).code == ButtonEvent.Hold
            )
        })
    })

    test("repeatedly raise hold events when held", async function () {
        const buttonServer = new ButtonServer("button", false)

        await withBus(async bus => {
            const {button} = await createServices(bus, {button: buttonServer})

            buttonServer.down()
            assert(
                (await nextEventFrom(button, { within: 100 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(button, {
                        after: 500,
                        tolerance: 100,
                    })
                ).code == ButtonEvent.Hold
            )
            assert(
                (
                    await nextEventFrom(button, {
                        after: 500,
                        tolerance: 100,
                    })
                ).code == ButtonEvent.Hold
            )

            buttonServer.up()
            assert(
                (await nextEventFrom(button, { within: 100 })).code ==
                    ButtonEvent.Up
            )
            await nextEventFrom(button, { within: 1000 }).then(
                () => {
                    assert(false, "got event from button after release")
                },
                () => {}
            ) // rejection is the expected case and nothing happens there
        })
    }).timeout(3000) // TODO remove when we can fast-forward tests

    test("detects repeated holds", async function () {
        const buttonServer = new ButtonServer("button", false)

        await withBus(async bus => {
            const {button} = await createServices(bus, {button: buttonServer})

            buttonServer.down()
            assert(
                (await nextEventFrom(button, { within: 100 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(button, {
                        after: 500,
                        tolerance: 100,
                    })
                ).code == ButtonEvent.Hold
            )

            buttonServer.up()
            assert(
                (await nextEventFrom(button, { within: 100 })).code ==
                    ButtonEvent.Up
            )

            buttonServer.down()
            assert(
                (await nextEventFrom(button, { within: 100 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(button, {
                        after: 500,
                        tolerance: 100,
                    })
                ).code == ButtonEvent.Hold
            )
        })
    })
})

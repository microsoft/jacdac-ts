// Test the ButtonServer, intended as a test for the unit test framework.
// Yes, we're meta-testing!

import { suite, test } from "mocha"
import { ButtonEvent } from "../../src/jdom/constants"
import { withBus, nextEventFrom } from "./tester"
import { assert } from "../../src/jdom/utils"
import ButtonServer from "../../src/servers/buttonserver"

suite("button server", () => {
    test("fires edge events after changing state", async function () {
        const buttonServer = new ButtonServer("button", false)

        await withBus([{ server: buttonServer }], async (bus, serviceMap) => {
            const buttonService = serviceMap.get(buttonServer) // TODO boilerplate, think about how to eliminate

            buttonServer.down()
            assert(
                (await nextEventFrom(buttonService, { within: 100 })).code ==
                    ButtonEvent.Down
            )

            buttonServer.up()
            assert(
                (await nextEventFrom(buttonService, { within: 100 })).code ==
                    ButtonEvent.Up
            )
        })
    })

    test("fires both down and hold events when held", async function () {
        const buttonServer = new ButtonServer("button", false)

        await withBus([{ server: buttonServer }], async (bus, serviceMap) => {
            const buttonService = serviceMap.get(buttonServer) // TODO boilerplate, think about how to eliminate

            buttonServer.down()
            assert(
                (await nextEventFrom(buttonService, { within: 100 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(buttonService, {
                        after: 500,
                        tolerance: 100,
                    })
                ).code == ButtonEvent.Hold
            )
        })
    })

    test("detects repeated holds", async function () {
        const buttonServer = new ButtonServer("button", false)

        await withBus([{ server: buttonServer }], async (bus, serviceMap) => {
            const buttonService = serviceMap.get(buttonServer) // TODO boilerplate, think about how to eliminate

            buttonServer.down()
            assert(
                (await nextEventFrom(buttonService, { within: 100 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(buttonService, {
                        after: 500,
                        tolerance: 100,
                    })
                ).code == ButtonEvent.Hold
            )

            buttonServer.up()
            assert(
                (await nextEventFrom(buttonService, { within: 100 })).code ==
                    ButtonEvent.Up
            )

            buttonServer.down()
            assert(
                (await nextEventFrom(buttonService, { within: 100 })).code ==
                    ButtonEvent.Down
            )
            assert(
                (
                    await nextEventFrom(buttonService, {
                        after: 500,
                        tolerance: 100,
                    })
                ).code == ButtonEvent.Hold
            )
        })
    })
})

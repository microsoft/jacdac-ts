import { suite, test } from "mocha"
import { ButtonEvent, ButtonReg } from "../../src/jdom/constants"
import ButtonServer from "../../src/servers/buttonserver"
import { ServiceTester } from "../../src/tstester/servicewrapper"
import { FastForwardTester } from "./fastforwardtester"

suite("button server", () => {
    // Tolerances are set to 50ms as a typical register update interval, plus another 50ms for event alignment
    test(
        "fires edge events after changing state",
        FastForwardTester.makeTest(async tester => {
            const { button } = await tester.createServices({
                button: new ButtonServer("button", false),
            })
            const service = new ServiceTester(button.service)
            const register = service.register(ButtonReg.Pressure)

            button.server.down() // TODO does this run the risk of firing the event immediately?
            await tester.waitForAll(
                [
                    service.onEvent(ButtonEvent.Down).hold(),
                    register
                        .onUpdate({
                            preRequiredRange: [0, 0.5],
                            triggerRange: [0.5, 1],
                        })
                        .hold(),
                ],
                { within: 100, synchronization: 50 }
            )

            button.server.up()
            await tester.waitForAll(
                [
                    service.nextEvent(ButtonEvent.Up).hold(),
                    register
                        .onUpdate({
                            preRequiredRange: [0.5, 1],
                            triggerRange: [0, 0.5],
                        })
                        .hold(),
                ],
                { within: 100, synchronization: 50 }
            )
        })
    )

    test(
        "fires down then hole events when held",
        FastForwardTester.makeTest(async tester => {
            const { button } = await tester.createServices({
                button: new ButtonServer("button", false),
            })
            const service = new ServiceTester(button.service)
            const register = service.register(ButtonReg.Pressure)

            button.server.down() // TODO does this run the risk of firing the event immediately?
            await tester.waitForAll(
                [
                    service.onEvent(ButtonEvent.Down).hold(),
                    register
                        .onUpdate({
                            preRequiredRange: [0, 0.5],
                            triggerRange: [0.5, 1],
                        })
                        .hold(),
                ],
                { within: 100, synchronization: 50 }
            )

            await tester.waitForAll(
                [
                    service.nextEvent(ButtonEvent.Hold).hold(),
                    register.hold([0.5, 1.0]),
                ],
                { after: 500, tolerance: 100 }
            )

            button.server.up()
            await tester.waitForAll(
                [
                    service.nextEvent(ButtonEvent.Up).hold(),
                    register
                        .onUpdate({
                            triggerRange: [0, 0.5],
                        })
                        .hold(),
                ],
                { within: 100, synchronization: 50 }
            )
        })
    )

    test(
        "fires hold events regularly",
        FastForwardTester.makeTest(async tester => {
            const { button } = await tester.createServices({
                button: new ButtonServer("button", false),
            })
            const service = new ServiceTester(button.service)
            // registers are ignored here, since they are tested elsewhere

            button.server.down()
            await tester.waitFor(service.nextEvent(ButtonEvent.Down), {
                within: 100,
            })

            await tester.waitFor(service.nextEvent(ButtonEvent.Hold), {
                after: 500,
                tolerance: 100,
            })

            await tester.waitFor(service.nextEvent(ButtonEvent.Hold), {
                after: 500,
                tolerance: 100,
            })

            await tester.waitFor(service.nextEvent(ButtonEvent.Hold), {
                after: 500,
                tolerance: 100,
            })

            await tester.waitFor(service.nextEvent(ButtonEvent.Hold), {
                after: 500,
                tolerance: 100,
            })
        })
    )

    test(
        "detects repeated holds",
        FastForwardTester.makeTest(async tester => {
            const { button } = await tester.createServices({
                button: new ButtonServer("button", false),
            })
            const service = new ServiceTester(button.service)
            // down events and registers are ignored here, since they are tested elsewhere

            button.server.down()
            await tester.waitFor(service.nextEvent(ButtonEvent.Down), {
                within: 100,
            })

            await tester.waitFor(service.nextEvent(ButtonEvent.Hold), {
                after: 500,
                tolerance: 100,
            })

            await tester.waitFor(service.nextEvent(ButtonEvent.Hold), {
                after: 500,
                tolerance: 100,
            })

            button.server.up()
            await tester.waitFor(service.nextEvent(ButtonEvent.Up), {
                within: 100,
            })

            await tester.waitForDelay(100)

            button.server.down()
            await tester.waitFor(service.nextEvent(ButtonEvent.Down), {
                within: 100,
            })

            await tester.waitFor(service.nextEvent(ButtonEvent.Hold), {
                after: 500,
                tolerance: 100,
            })

            await tester.waitFor(service.nextEvent(ButtonEvent.Hold), {
                after: 500,
                tolerance: 100,
            })
        })
    )
})

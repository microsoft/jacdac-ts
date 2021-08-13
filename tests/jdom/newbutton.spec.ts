import { suite, test } from "mocha"
import { ButtonEvent, ButtonReg } from "../../src/jdom/constants"
import ButtonServer from "../../src/servers/buttonserver"
import { ServiceTester } from "../../src/tstester/servicewrapper"
import { makeTest } from "./fastforwardtester"

suite("button server", () => {
    // Tolerances are set to 50ms as a typical register update interval, plus another 50ms for event alignment
    test(
        "fires edge events after changing state",
        makeTest(async tester => {
            const { button } = await tester.createServices({
                button: new ButtonServer("button", false),
            })
            const service = new ServiceTester(button.service)
            const register = service.register(ButtonReg.Pressure)

            button.server.down() // TODO does this run the risk of firing the event immediately?
            await tester.waitFor(
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
            await tester.waitFor(
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
        "fires hold events regularly",
        makeTest(async tester => {
            const { button } = await tester.createServices({
                button: new ButtonServer("button", false),
            })
            const service = new ServiceTester(button.service)
            const register = service.register(ButtonReg.Pressure)

            button.server.down() // TODO does this run the risk of firing the event immediately?
            await tester.waitFor(
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

            await tester.waitFor(
                [
                    service.nextEvent(ButtonEvent.Hold).hold(),
                    register.hold([0.5, 1.0]),
                ],
                { after: 500, tolerance: 100 }
            )

            await tester.waitFor(
                [
                    service.nextEvent(ButtonEvent.Hold).hold(),
                    register.hold([0.5, 1.0]),
                ],
                { after: 500, tolerance: 100 }
            )

            await tester.waitFor(
                [
                    service.nextEvent(ButtonEvent.Hold).hold(),
                    register.hold([0.5, 1.0]),
                ],
                { after: 500, tolerance: 100 }
            )

            button.server.up()
            await tester.waitFor(
                [
                    service.onEvent(ButtonEvent.Up).hold(), // ignore any continued hold events
                    register
                        .onUpdate({
                            triggerRange: [0, 0.5],
                        })
                        .hold(),
                ],
                { synchronization: 50 }
            )
        })
    )
})

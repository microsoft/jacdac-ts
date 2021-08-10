import { suite, test } from "mocha"
import { ButtonEvent, ButtonReg } from "../../src/jdom/constants"
import { SRV_POTENTIOMETER, SystemReg } from "../../src/jdom/constants"
import SensorServer from "../../src/servers/sensorserver"
import ButtonServer from "../../src/servers/buttonserver"
import { ServerCsvSource } from "./servercsvsource"
import { FastForwardTester } from "./fastforwardtester"
import { RegisterTester } from "../../src/tstester/registerwrapper"
import { ServiceTester } from "../../src/tstester/servicewrapper"

// Configured to ignore differences for a 16-bit fixed point
function makeTolerancedRange(
    center: number,
    tolerance = 1 / 32767
): [number, number] {
    return [center * (1 - tolerance), center * (1 + tolerance)]
}

suite('"CSV" trace server', () => {
    test(
        "produces register data as expected",
        FastForwardTester.makeTest(async tester => {
            const { pot } = await tester.createServices({
                pot: new SensorServer<[number]>(SRV_POTENTIOMETER),
            })
            const potStreamer = new ServerCsvSource(
                {
                    "BP95.position": pot.server.reading,
                },
                [
                    // takes about 500ms for the bus to spin up
                    { time: 0.6, "BP95.position": 0.5 },
                    { time: 0.8, "BP95.position": 1.0 },
                    { time: 1.0, "BP95.position": 0.8 },
                    { time: 1.2, "BP95.position": 0.6 },
                ]
            )
            const register = new RegisterTester(
                pot.service.register(SystemReg.Reading)
            )

            await tester.waitFor(
                register.onUpdate({ triggerRange: makeTolerancedRange(0.5) })
                // absolute time not tested, just wait for first sample
            )
            await tester.waitFor(
                register.onUpdate({ triggerRange: makeTolerancedRange(1.0) }),
                { after: 200, tolerance: 50 }
            )
            await tester.waitFor(
                register.onUpdate({ triggerRange: makeTolerancedRange(0.8) }),
                { after: 200, tolerance: 50 }
            )
            await tester.waitFor(
                register.onUpdate({ triggerRange: makeTolerancedRange(0.6) }),
                { after: 200, tolerance: 50 }
            )
        })
    )

    test(
        "should ignore null cells",
        FastForwardTester.makeTest(async tester => {
            const { pot } = await tester.createServices({
                pot: new SensorServer<[number]>(SRV_POTENTIOMETER),
            })
            const potStreamer = new ServerCsvSource(
                {
                    "BP95.position": pot.server.reading,
                },
                [
                    // takes about 500ms for the bus to spin up
                    { time: 0.6, "BP95.position": 0.5 },
                    { time: 0.8, "BP95.position": null }, // ignored, previous value unchanged
                    { time: 1.0, "BP95.position": 1.0 },
                ]
            )
            const register = new RegisterTester(
                pot.service.register(SystemReg.Reading)
            )

            await tester.waitFor(
                register.onUpdate({ triggerRange: makeTolerancedRange(0.5) })
                // absolute time not tested, just wait for first sample
            )
            await tester.waitFor(
                register.onUpdate({ triggerRange: makeTolerancedRange(1.0) }),
                { after: 400, tolerance: 50 }
            )
        })
    )

    test(
        "produces derived events supported by the underlying server",
        FastForwardTester.makeTest(async tester => {
            const { button } = await tester.createServices({
                button: new ButtonServer(),
            })
            const buttonStreamer = new ServerCsvSource(
                {
                    "AB34.pressure": button.server.reading,
                },
                [
                    // takes about 500ms for the bus to spin up
                    { time: 0.0, "AB34.pressure": ButtonServer.INACTIVE_VALUE },
                    { time: 0.7, "AB34.pressure": ButtonServer.ACTIVE_VALUE },
                    { time: 0.9, "AB34.pressure": ButtonServer.INACTIVE_VALUE },
                ]
            )
            const service = new ServiceTester(button.service)
            const register = service.register(ButtonReg.Pressure)

            await tester.waitForAll(
                [
                    service.nextEvent(ButtonEvent.Down).hold(),
                    register
                        .onUpdate({
                            preRequiredRange: makeTolerancedRange(
                                ButtonServer.INACTIVE_VALUE
                            ),
                            triggerRange: makeTolerancedRange(
                                ButtonServer.ACTIVE_VALUE
                            ),
                        })
                        .hold(),
                ]
                // absolute time not tested, just wait for first sample
            )
            await tester.waitForAll(
                [
                    service.nextEvent(ButtonEvent.Up).hold(),
                    register
                        .onUpdate({
                            preRequiredRange: makeTolerancedRange(
                                ButtonServer.ACTIVE_VALUE
                            ),
                            triggerRange: makeTolerancedRange(
                                ButtonServer.INACTIVE_VALUE
                            ),
                        })
                        .hold(),
                ],
                { after: 200, tolerance: 50, synchronization: 50 }
            )
        })
    )
})

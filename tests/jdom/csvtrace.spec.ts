import { suite, test } from "mocha"
import { ButtonEvent } from "../../src/jdom/constants"
import {
    withTestBus,
    nextEventFrom,
    nextUpdateFrom,
    createServices,
    runForDelay,
} from "./tester"
import { assert } from "../../src/jdom/utils"
import { SRV_POTENTIOMETER, SystemReg } from "../../src/jdom/constants"
import SensorServer from "../../src/servers/sensorserver"
import ButtonServer from "../../src/servers/buttonserver"
import { ServerCsvSource } from "./sensorcsvsource"

// Configured to ignore differences for a 16-bit fixed point
function approxEquals(
    actual: number,
    expected: number,
    maxPctDiff = 1 / 32767
) {
    if (expected == 0) {
        // special case to avoid divide-by-zero
        return actual == 0
    } else {
        return Math.abs(actual - expected) / expected < maxPctDiff
    }
}

suite('"CSV" trace server', () => {
    test("produces register data as expected", async function () {
        await withTestBus(async bus => {
            const { pot } = await createServices(bus, {
                pot: new SensorServer<[number]>(SRV_POTENTIOMETER),
            })
            const potStreamer = new ServerCsvSource({
                "BP95.position": pot.server.reading
            }, [
                // takes about 500ms for the bus to spin up
                {time: 0.6, "BP95.position": 0.5},
                {time: 0.8, "BP95.position": 1.0},
                {time: 1.0, "BP95.position": 0.8},
                {time: 1.2, "BP95.position": 0.6},
            ])

            console.log(pot.server.reading.specification.identifier)
            console.log(pot.server.reading.specification.name)

            // TODO ideally this would use potService.register(SystemReg.Reading).unpackedValue
            // but timing of the update seems really iffy, so the tests are instead synchronized
            // to register events.

            await runForDelay(bus, 600 + 10 - bus.timestamp)
            assert(
                approxEquals(
                    (
                        await nextUpdateFrom(
                            pot.service.register(SystemReg.Reading)
                        )
                    )[0],
                    0.5
                )
            )

            await runForDelay(bus, 800 + 10 - bus.timestamp)
            assert(
                approxEquals(
                    (
                        await nextUpdateFrom(
                            pot.service.register(SystemReg.Reading)
                        )
                    )[0],
                    1.0
                )
            )

            await runForDelay(bus, 1000 + 10 - bus.timestamp)
            assert(
                approxEquals(
                    (
                        await nextUpdateFrom(
                            pot.service.register(SystemReg.Reading)
                        )
                    )[0],
                    0.8
                )
            )

            await runForDelay(bus, 1200 + 10 - bus.timestamp)
            assert(
                approxEquals(
                    (
                        await nextUpdateFrom(
                            pot.service.register(SystemReg.Reading)
                        )
                    )[0],
                    0.6
                )
            )
        })
    })

    test("produces derived events supported by the underlying server", async function () {
        await withTestBus(async bus => {
            const { button } = await createServices(bus, {
                button: new ButtonServer(),
            })
            const buttonStreamer = new ServerCsvSource({
                "AB34.pressure": button.server.reading
            }, [
                // takes about 500ms for the bus to spin up
                {time: 0.0, "AB34.pressure": ButtonServer.INACTIVE_VALUE},
                {time: 0.7, "AB34.pressure": ButtonServer.ACTIVE_VALUE},
                {time: 0.9, "AB34.pressure": ButtonServer.INACTIVE_VALUE},
            ])

            await runForDelay(bus, 700 + 10 - bus.timestamp)
            assert(
                (await nextEventFrom(button.service, { within: 110 })).code ==
                    ButtonEvent.Down
            )

            await runForDelay(bus, 900 + 10 - bus.timestamp)
            assert(
                (await nextEventFrom(button.service, { within: 110 })).code ==
                    ButtonEvent.Up
            )
        })
    })
})

import { suite, test } from "mocha"
import { ButtonEvent } from "../../src/jdom/constants"
import { withTestBus, nextEventFrom, nextUpdateFrom, createServices } from "./tester"
import { assert } from "../../src/jdom/utils"

import {
    DEVICE_CHANGE,
    REFRESH,
    SensorReg,
    SRV_POTENTIOMETER,
    SystemReg,
} from "../../src/jdom/constants"
import { jdpack, PackedValues } from "../../src/jdom/pack"
import JDServiceServer from "../../src/jdom/serviceserver"
import {
    isRegister,
    serviceSpecificationFromClassIdentifier,
} from "../../src/jdom/spec"
import SensorServer, {
    SensorServiceOptions,
} from "../../src/servers/sensorserver"
import ButtonServer from "../../src/servers/buttonserver"
import { SensorServerCsvSource } from "./sensorcsvsource"
import { FastForwardScheduler } from "./scheduler"


// Configured to ignore differences for a 16-bit fixed point
function approxEquals(a: number, b: number, maxPctDiff = 1 / 32767) {
    return Math.abs(b - a) / Math.min(b, a) < maxPctDiff
}

suite('"CSV" trace server', () => {
    test("produces register data as expected", async function () {
        await withTestBus(async bus => {
            const { pot } = await createServices(bus, {
                pot: new SensorServer<[number]>(SRV_POTENTIOMETER)
            })
            const potStreamer = new SensorServerCsvSource(pot.server, [
                // takes about 500ms for the bus to spin up
                [0.6, 0.5],
                [0.8, 1.0],
                [1.0, 0.8],
                [1.2, 0.6],
            ])

            // TODO ideally this would use potService.register(SystemReg.Reading).unpackedValue
            // but timing of the update seems really iffy, so the tests are instead synchronized
            // to register events.

            await (bus.scheduler as FastForwardScheduler).runForDelay(600 + 10 - bus.timestamp)
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

            await (bus.scheduler as FastForwardScheduler).runForDelay(800 + 10 - bus.timestamp)
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

            await (bus.scheduler as FastForwardScheduler).runForDelay(1000 + 10 - bus.timestamp)
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

            await (bus.scheduler as FastForwardScheduler).runForDelay(1200 + 10 - bus.timestamp)
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
                button: new ButtonServer()
            })
            // TODO better control over when this starts
            const buttonStreamer = new SensorServerCsvSource(button.server, [
                // takes about 500ms for the bus to spin up
                [0.0, ButtonServer.INACTIVE_VALUE],
                [0.7, ButtonServer.ACTIVE_VALUE],
                [0.9, ButtonServer.INACTIVE_VALUE],
            ])

            await (bus.scheduler as FastForwardScheduler).runForDelay(700 - bus.timestamp)
            assert(
                (await nextEventFrom(button.service, { within: 110 })).code ==
                    ButtonEvent.Down
            )

            await (bus.scheduler as FastForwardScheduler).runForDelay(900 - bus.timestamp)
            assert(
                (await nextEventFrom(button.service, { within: 110 })).code ==
                    ButtonEvent.Up
            )
        })
    })
})

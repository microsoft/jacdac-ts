import { suite, test } from "mocha"
import { ButtonEvent } from "../../src/jdom/constants"
import { withBus, nextEventFrom, nextUpdateFrom } from "./tester"
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

/**
 * WIP / TODO: move into its own file, that's not in the test folder.
 *
 * Streams data from a "CSV" into a SensorServer, using its sensorServer.reading.setValues(...)
 * interface.
 *
 * "CSV" is formatted as (for example):
 * [
 *   [  0, 24.0],
 *   [1.0, 24.1],
 *   [1.2, 23.9],
 *   ...
 * ]
 *
 * The first column is the timestamp, in ms, and the second column is the reading.
 * The number of specified registers must match exactly the number of columns.
 *
 * Note that this only writes to registers and DOES NOT generate derived events.
 * For example, if used with the button, it will not generate up and down events.
 */
export class SensorServerCsvSource {
    protected nextDataIndex = 0 // index (in this.data) of next value

    constructor(
        protected readonly sensorServer: SensorServer<[number]>,
        protected readonly data: number[][]
    ) {
        // TODO timings are only approximate, perhaps this should use bus.scheduler.setTimeout
        // instead, but that needs a bus handle and there isn't an event when a device has its
        // bus assigned.
        sensorServer.on(REFRESH, this.handleRefresh.bind(this))
    }

    protected handleRefresh() {
        const now = this.sensorServer.device.bus.timestamp

        while (
            this.nextDataIndex < this.data.length &&
            this.data[this.nextDataIndex][0] * 1000 <= now
        ) {
            const value = this.data[this.nextDataIndex][1]
            this.sensorServer.reading.setValues([value])
            this.nextDataIndex++
        }
    }
}

// Configured to ignore differences for a 16-bit fixed point
function approxEquals(a: number, b: number, maxPctDiff = 1 / 32767) {
    return Math.abs(b - a) / Math.min(b, a) < maxPctDiff
}

suite('"CSV" trace server', () => {
    test("produces register data as expected", async function () {
        const potServer = new SensorServer<[number]>(SRV_POTENTIOMETER)
        const potStreamer = new SensorServerCsvSource(potServer, [
            // takes about 500ms for the bus to spin up
            [0.6, 0.5],
            [0.8, 1.0],
            [1.0, 0.8],
            [1.2, 0.6],
        ])

        await withBus([{ server: potServer }], async (bus, serviceMap) => {
            const potService = serviceMap.get(potServer) // TODO boilerplate, think about how to eliminate

            // TODO ideally this would use potService.register(SystemReg.Reading).unpackedValue
            // but timing of the update seems really iffy, so the tests are instead synchronized
            // to register events.

            await bus.delay(600 + 50 - bus.timestamp) // 50ms tolerance for update
            assert(
                approxEquals(
                    (
                        await nextUpdateFrom(
                            potService.register(SystemReg.Reading)
                        )
                    )[0],
                    0.5
                )
            )

            await bus.delay(800 + 50 - bus.timestamp) // 50ms tolerance for update
            assert(
                approxEquals(
                    (
                        await nextUpdateFrom(
                            potService.register(SystemReg.Reading)
                        )
                    )[0],
                    1.0
                )
            )

            await bus.delay(1000 + 50 - bus.timestamp) // 50ms tolerance for update
            assert(
                approxEquals(
                    (
                        await nextUpdateFrom(
                            potService.register(SystemReg.Reading)
                        )
                    )[0],
                    0.8
                )
            )

            await bus.delay(1200 + 50 - bus.timestamp) // 50ms tolerance for update
            assert(
                approxEquals(
                    (
                        await nextUpdateFrom(
                            potService.register(SystemReg.Reading)
                        )
                    )[0],
                    0.6
                )
            )
        })
    })

    test("produces derived events supported by the underlying server", async function () {
        const buttonServer = new ButtonServer()
        const buttonStreamer = new SensorServerCsvSource(buttonServer, [
            // takes about 500ms for the bus to spin up
            [0.0, ButtonServer.INACTIVE_VALUE],
            [0.7, ButtonServer.ACTIVE_VALUE],
            [0.9, ButtonServer.INACTIVE_VALUE],
        ])

        await withBus([{ server: buttonServer }], async (bus, serviceMap) => {
            const buttonService = serviceMap.get(buttonServer) // TODO boilerplate, think about how to eliminate

            await bus.delay(700 - bus.timestamp)
            assert(
                (await nextEventFrom(buttonService, { within: 100 })).code ==
                    ButtonEvent.Down
            )

            await bus.delay(900 - bus.timestamp)
            assert(
                (await nextEventFrom(buttonService, { within: 100 })).code ==
                    ButtonEvent.Up
            )
        })
    })
})

import { suite, test } from "mocha"
import { readFileSync } from "fs"
import { VMProgram } from "../../src/vm/ir"
import { VMProgramRunner } from "../../src/vm/runner"
import { JDBus } from "../../src/jdom/bus"

import {
    withTestBus,
    createServices,
    CreatedServerService,
    runForDelay,
    nextEventFrom,
} from "../jdom/tester"
import RoleManager from "../../src/servers/rolemanager"
import { assert } from "../../src/jdom/utils"
import { bindRoles, getRoles } from "./vmtester"
import {
    SRV_POTENTIOMETER,
    SwitchEvent,
    SwitchReg,
} from "../../jacdac-spec/dist/specconstants"
import { JDService } from "../../src/jdom/service"
import SensorServer from "../../src/servers/sensorserver"
import { EVENT } from "../../src/jdom/constants"
import { JDEvent } from "../../src/jdom/event"

suite("pot to switch adapter", () => {
    const program: VMProgram = JSON.parse(
        readFileSync("vm/suites/pottoswitch.json", "utf8")
    )

    async function withHarness(
        testBody: (
            bus: JDBus,
            pot: CreatedServerService<SensorServer<[number]>>,
            sw: JDService
        ) => void
    ) {
        await withTestBus(async bus => {
            const { pot } = await createServices(bus, {
                pot: new SensorServer<[number]>(SRV_POTENTIOMETER, {
                    readingValues: [0],
                }),
            })
            const roleMgr = new RoleManager(bus)
            bindRoles(roleMgr, program, {
                "potentiometer 1": pot.service,
            })

            const runner = new VMProgramRunner(roleMgr, program)
            await runner.device()

            const { "switch server 1": sw } = await getRoles(roleMgr, program)

            await runner.startAsync()

            await testBody(bus, pot, sw)
        })
    }

    test("turns on", async () => {
        await withHarness(async (bus, pot, sw) => {
            pot.server.reading.setValues([0.2])
            pot.server.streamingSamples.setValues([1])
            await runForDelay(bus, 100)

            pot.server.reading.setValues([0.7])
            pot.server.streamingSamples.setValues([1])

            assert(
                (
                    await nextEventFrom(sw, {
                        within: 100,
                    })
                ).code == SwitchEvent.On
            )
            await sw.register(SwitchReg.Active).refresh()
            assert(sw.register(SwitchReg.Active).unpackedValue[0] == 1)
        })
    })

    test("turns off", async () => {
        await withHarness(async (bus, pot, sw) => {
            pot.server.reading.setValues([1])
            pot.server.streamingSamples.setValues([1])
            await runForDelay(bus, 100)

            pot.server.reading.setValues([0.3])
            pot.server.streamingSamples.setValues([1])
            assert(
                (
                    await nextEventFrom(sw, {
                        within: 100,
                    })
                ).code == SwitchEvent.Off
            )
            await sw.register(SwitchReg.Active).refresh()
            assert(sw.register(SwitchReg.Active).unpackedValue[0] == 0)
        })
    })

    test("does not turn off within hysteresis region", async () => {
        await withHarness(async (bus, pot, sw) => {
            pot.server.reading.setValues([0.9])
            pot.server.streamingSamples.setValues([1])
            await runForDelay(bus, 100)

            pot.server.reading.setValues([0.55])
            pot.server.streamingSamples.setValues([1])
            // TODO check for absence of event?

            await sw.register(SwitchReg.Active).refresh()
            assert(sw.register(SwitchReg.Active).unpackedValue[0])
        })
    })

    test("does not turn on within hysteresis region", async () => {
        await withHarness(async (bus, pot, sw) => {
            pot.server.reading.setValues([0])
            pot.server.streamingSamples.setValues([1])
            await runForDelay(bus, 100)

            pot.server.reading.setValues([0.55])
            pot.server.streamingSamples.setValues([1])
            // TODO check for absence of event?
            await sw.register(SwitchReg.Active).refresh()
            assert(sw.register(SwitchReg.Active).unpackedValue[0] === 0)
        })
    })
})

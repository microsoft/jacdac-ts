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
import ButtonServer from "../../src/servers/buttonserver"
import RoleManager from "../../src/servers/rolemanager"
import ServoServer from "../../src/servers/servoserver"
import { assert } from "../../src/jdom/utils"
import { bindRoles, getRoles } from "./vmtester"
import { SRV_POTENTIOMETER, SwitchEvent, SwitchReg } from "../../jacdac-spec/dist/specconstants"
import { EVENT } from "../../src/jdom/constants"
import { JDService } from "../../src/jdom/service"
import { JDEvent } from "../../src/jdom/event"
import SensorServer from "../../src/servers/sensorserver"

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
                pot: new SensorServer<[number]>(SRV_POTENTIOMETER),
            })
            const roleMgr = new RoleManager(bus)
            bindRoles(roleMgr, program, {
                "potentiometer 1": pot.service,
            })

            const runner = new VMProgramRunner(roleMgr, program)
            await runner.startAsync()

            const { "switch server 1": sw } = await getRoles(roleMgr, program)

            await testBody(bus, pot, sw)
        })
    }

    test("turns on", async () => {
        await withHarness(async (bus, pot, sw) => {
            pot.server.reading.setValues([0])
            await runForDelay(bus, 100)

            pot.server.reading.setValues([0.7])
            assert(
                (
                    await nextEventFrom(sw, {
                        within: 100
                    })
                ).code == SwitchEvent.On
            )
            assert(sw.register(SwitchReg.Active).unpackedValue[0] == 1)
        })
    })

    test("turns off", async () => {
        await withHarness(async (bus, pot, sw) => {
            pot.server.reading.setValues([1])
            await runForDelay(bus, 100)

            pot.server.reading.setValues([0.3])
            assert(
                (
                    await nextEventFrom(sw, {
                        within: 100
                    })
                ).code == SwitchEvent.On
            )
            assert(sw.register(SwitchReg.Active).unpackedValue[0] == 1)
        })
    })

    test("does not turn off within hysteresis region", async () => {
        await withHarness(async (bus, pot, sw) => {
            pot.server.reading.setValues([1])
            await runForDelay(bus, 100)

            pot.server.reading.setValues([0.45])
            // TODO check for absence of event?
            assert(sw.register(SwitchReg.Active).unpackedValue[0] == 1)
        })
    })

    test("does not turn on within hysteresis region", async () => {
        await withHarness(async (bus, pot, sw) => {
            pot.server.reading.setValues([0])
            await runForDelay(bus, 100)

            pot.server.reading.setValues([0.55])
            // TODO check for absence of event?
            assert(sw.register(SwitchReg.Active).unpackedValue[0] == 0)
        })
    })
})

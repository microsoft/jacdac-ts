import { suite, test } from "mocha"
import { readFileSync } from "fs"
import { VMProgram } from "../../src/vm/ir"
import { VMProgramRunner } from "../../src/vm/runner"

import { CreatedServerService, makeTest } from "../jdom/fastforwardtester"
import RoleManager from "../../src/servers/rolemanager"
import { assert } from "../../src/jdom/utils"
import { bindRoles, getRoles } from "./vmtester"
import {
    SRV_POTENTIOMETER,
    SwitchEvent,
    SwitchReg,
} from "../../jacdac-spec/dist/specconstants"
import SensorServer from "../../src/servers/sensorserver"
import { FastForwardTester } from "../jdom/fastforwardtester"
import { ServiceTester } from "../../src/tstester/servicewrapper"

suite("pot to switch adapter", () => {
    const program: VMProgram = JSON.parse(
        readFileSync("vm/suites/pottoswitch.json", "utf8")
    )

    function makeVmTest(
        testBody: (
            tester: FastForwardTester,
            pot: CreatedServerService<SensorServer<[number]>>,
            sw: ServiceTester
        ) => void
    ) {
        return makeTest(async tester => {
            const { pot } = await tester.createServices({
                pot: new SensorServer<[number]>(SRV_POTENTIOMETER, {
                    readingValues: [0],
                }),
            })
            const roleMgr = new RoleManager(tester.bus)
            bindRoles(roleMgr, program, {
                "potentiometer 1": pot.service,
            })

            const runner = new VMProgramRunner(roleMgr, program)
            await runner.device()

            const { "switch server 1": sw } = await getRoles(
                tester,
                roleMgr,
                program
            )

            await runner.startAsync()

            await testBody(tester, pot, new ServiceTester(sw))
        })
    }

    test(
        "turns on",
        makeVmTest(async (tester, pot, sw) => {
            pot.server.reading.setValues([0.2])
            await tester.waitForDelay(100)
            pot.server.reading.setValues([0.7])

            await tester.waitFor(
                [
                    sw.nextEvent(SwitchEvent.On),
                    // sw.register(SwitchReg.Active).onUpdate({triggerRange: [0.5, 1]})
                ],
                { within: 100, synchronization: 50 }
            )
        })
    )

    test(
        "turns off",
        makeVmTest(async (tester, pot, sw) => {
            pot.server.reading.setValues([1])
            await tester.waitForDelay(100)

            pot.server.reading.setValues([0.3])

            await tester.waitFor(
                [
                    sw.nextEvent(SwitchEvent.Off),
                    // sw.register(SwitchReg.Active).onUpdate({triggerRange: [0, 0.5]})
                ],
                { within: 100, synchronization: 50 }
            )
        })
    )

    test(
        "does not turn off within hysteresis region",
        makeVmTest(async (tester, pot, sw) => {
            pot.server.reading.setValues([0.9])
            await tester.waitForDelay(100)

            pot.server.reading.setValues([0.45])
            // TODO check for absence of event?
            await sw.register(SwitchReg.Active).register.refresh()
            assert(
                sw.register(SwitchReg.Active).register.unpackedValue[0] > 0.5
            )
        })
    )

    test(
        "does not turn on within hysteresis region",
        makeVmTest(async (tester, pot, sw) => {
            pot.server.reading.setValues([0])
            await tester.waitForDelay(100)

            pot.server.reading.setValues([0.55])
            // TODO check for absence of event?
            await sw.register(SwitchReg.Active).register.refresh()
            assert(
                sw.register(SwitchReg.Active).register.unpackedValue[0] < 0.5
            )
        })
    )
})

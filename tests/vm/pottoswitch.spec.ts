import { suite, test } from "mocha"
import { readFileSync } from "fs"
import { VMProgram } from "../../src/vm/ir"
import { VMProgramRunner } from "../../src/vm/runner"

import { makeTest } from "../jdom/fastforwardtester"
import RoleManager from "../../src/servers/rolemanager"
import { bindRoles, getRoles } from "./vmtester"
import {
    SRV_POTENTIOMETER,
    SwitchEvent,
    SwitchReg,
} from "../../jacdac-spec/dist/specconstants"
import SensorServer from "../../src/servers/sensorserver"
import { FastForwardTester } from "../jdom/fastforwardtester"
import { ServiceTester } from "../../src/tstester/servicewrapper"
import JDRegisterServer from "../../src/jdom/registerserver"

suite("pot to switch adapter", () => {
    const program: VMProgram = JSON.parse(
        readFileSync("vm/suites/pottoswitch.json", "utf8")
    )

    function makeVmTest(
        testBody: (
            tester: FastForwardTester,
            pot: JDRegisterServer<[number]>,
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

            await testBody(tester, pot.server.reading, new ServiceTester(sw))
        })
    }

    test(
        "turns on",
        makeVmTest(async (tester, pot, sw) => {
            pot.setValues([0.2])
            await tester.waitForDelay(100)

            await tester.assertWith(
                [
                    sw.nextEvent(SwitchEvent.On),
                    sw
                        .register(SwitchReg.Active)
                        .onValue(1),
                ],
                async () => {
                    pot.setValues([0.7])
                    await tester.waitForDelay(150) // takes longer than 100ms for register to update
                }
            )
        })
    )

    test(
        "turns off",
        makeVmTest(async (tester, pot, sw) => {
            pot.setValues([1])
            await tester.waitForDelay(100)

            await tester.assertWith(
                [
                    sw.nextEvent(SwitchEvent.Off),
                    sw
                        .register(SwitchReg.Active)
                        .onValue(0),
                ],
                async () => {
                    pot.setValues([0.3])
                    await tester.waitForDelay(150) // takes longer than 100ms for register to update
                }
            )
        })
    )

    test(
        "does not turn off within hysteresis region",
        makeVmTest(async (tester, pot, sw) => {
            pot.setValues([0.9])
            await tester.waitForDelay(100)

            await tester.assertWith(
                [sw.hold(), sw.register(SwitchReg.Active).hold(1)],
                async () => {
                    pot.setValues([0.45])
                    await tester.waitForDelay(150)
                }
            )
        })
    )

    test(
        "does not turn on within hysteresis region",
        makeVmTest(async (tester, pot, sw) => {
            pot.setValues([0])
            await tester.waitForDelay(100)

            await tester.assertWith(
                [sw.hold(), sw.register(SwitchReg.Active).hold(0)],
                async () => {
                    pot.setValues([0.55])
                    await tester.waitForDelay(150)
                }
            )
        })
    )
})

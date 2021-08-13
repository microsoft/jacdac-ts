import { suite, test } from "mocha"
import { readFileSync } from "fs"
import { VMProgram } from "../../src/vm/ir"
import { VMProgramRunner } from "../../src/vm/runner"

import { makeTest } from "../jdom/fastforwardtester"
import ButtonServer from "../../src/servers/buttonserver"
import RoleManager from "../../src/servers/rolemanager"
import ServoServer from "../../src/servers/servoserver"
import { bindRoles } from "./vmtester"
import { FastForwardTester } from "../jdom/fastforwardtester"
import { RegisterTester } from "../../src/tstester/registerwrapper"
import { ServoReg } from "../../jacdac-spec/dist/specconstants"

suite("remember servo", () => {
    const program: VMProgram = JSON.parse(
        readFileSync("vm/suites/rememberservo.json", "utf8")
    )

    function makeVmTest(
        testBody: (
            tester: FastForwardTester,
            recall: ButtonServer,
            set: ButtonServer,
            servo: ServoServer,
            servoReg: RegisterTester
        ) => void
    ) {
        return makeTest(async tester => {
            const { recall, set, servo } = await tester.createServices({
                recall: new ButtonServer("button", false),
                set: new ButtonServer("button", false),
                servo: new ServoServer(),
            })
            const roleMgr = new RoleManager(tester.bus)
            bindRoles(roleMgr, program, {
                recall: recall.service,
                set: set.service,
                "servo 1": servo.service,
            })

            const runner = new VMProgramRunner(roleMgr, program)
            await runner.startAsync()

            const servoReg = new RegisterTester(
                servo.service.register(ServoReg.Angle)
            )
            await testBody(
                tester,
                recall.server,
                set.server,
                servo.server,
                servoReg
            )
        })
    }

    test(
        "sets and recalls",
        makeVmTest(async (tester, recall, set, servo, servoReg) => {
            servo.angle.setValues([50])
            set.down()
            await tester.waitForDelay(100)
            set.up()
            await tester.waitForDelay(100)

            servo.angle.setValues([0]) // make sure the difference on recall is visible
            await tester.assertWith(servoReg.onValue(50).hold(), async () => {
                recall.down()
                await tester.waitForDelay(100)
                recall.up()
                await tester.waitForDelay(100)
            })
        })
    )

    test(
        "sets, re-sets, and recalls",
        makeVmTest(async (tester, recall, set, servo, servoReg) => {
            servo.angle.setValues([50])
            set.down()
            await tester.waitForDelay(100)
            set.up()
            await tester.waitForDelay(100)

            servo.angle.setValues([-50])
            set.down()
            await tester.waitForDelay(100)
            set.up()
            await tester.waitForDelay(100)

            servo.angle.setValues([0]) // make sure the difference on recall is visible
            await tester.assertWith(servoReg.onValue(-50).hold(), async () => {
                recall.down()
                await tester.waitForDelay(100)
                recall.up()
                await tester.waitForDelay(100)
            })
        })
    )
})

import { suite, test } from "mocha"
import { readFileSync } from "fs"
import { VMProgram } from "../../src/vm/ir"
import { VMProgramRunner } from "../../src/vm/runner"

import { CreatedServerService, makeTest } from "../jdom/fastforwardtester"
import ButtonServer from "../../src/servers/buttonserver"
import RoleManager from "../../src/servers/rolemanager"
import ServoServer from "../../src/servers/servoserver"
import { assert } from "../../src/jdom/utils"
import { bindRoles } from "./vmtester"
import { FastForwardTester } from "../jdom/fastforwardtester"

suite("remember servo", () => {
    const program: VMProgram = JSON.parse(
        readFileSync("vm/suites/rememberservo.json", "utf8")
    )

    function makeVmTest(
        testBody: (
            tester: FastForwardTester,
            recall: CreatedServerService<ButtonServer>,
            set: CreatedServerService<ButtonServer>,
            servo: CreatedServerService<ServoServer>
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

            await testBody(tester, recall, set, servo)
        })
    }

    test(
        "sets and recalls",
        makeVmTest(async (tester, recall, set, servo) => {
            servo.server.angle.setValues([50])
            set.server.down()

            await tester.waitForDelay(100)
            set.server.up()

            servo.server.angle.setValues([0]) // make sure the difference on recall is visible
            assert(servo.server.angle.values()[0] == 0.0)

            recall.server.down()
            await tester.waitForDelay(100)
            recall.server.up()
            assert(servo.server.angle.values()[0] == 50.0)
        })
    )

    test(
        "sets, re-sets, and recalls",
        makeVmTest(async (tester, recall, set, servo) => {
            servo.server.angle.setValues([50])
            set.server.down()
            await tester.waitForDelay(100)
            set.server.up()

            await tester.waitForDelay(100)
            servo.server.angle.setValues([-50])
            set.server.down()
            await tester.waitForDelay(100)
            set.server.up()

            servo.server.angle.setValues([0]) // make sure the difference on recall is visible
            assert(servo.server.angle.values()[0] == 0.0)

            recall.server.down()
            await tester.waitForDelay(100)
            recall.server.up()
            assert(servo.server.angle.values()[0] == -50.0)
        })
    )
})

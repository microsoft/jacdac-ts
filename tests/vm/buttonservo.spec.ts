import { suite, test } from "mocha"
import { readFileSync } from "fs"
import { VMProgram } from "../../src/vm/ir"
import { VMProgramRunner } from "../../src/vm/runner"

import { CreatedServerService } from "../jdom/tester"
import ButtonServer from "../../src/servers/buttonserver"
import RoleManager from "../../src/servers/rolemanager"
import ServoServer from "../../src/servers/servoserver"
import { assert } from "../../src/jdom/utils"
import { bindRoles } from "./vmtester"
import { FastForwardTester } from "../jdom/fastforwardtester"

suite("button servo", () => {
    const program: VMProgram = JSON.parse(
        readFileSync("vm/suites/buttonservo.json", "utf8")
    )

    function makeVmTest(
        testBody: (
            tester: FastForwardTester,
            button: CreatedServerService<ButtonServer>,
            servo: CreatedServerService<ServoServer>
        ) => void
    ) {
        return FastForwardTester.makeTest(async tester => {
            const { button, servo } = await tester.createServices({
                button: new ButtonServer("button", false),
                servo: new ServoServer(),
            })
            const roleMgr = new RoleManager(tester.bus)
            bindRoles(roleMgr, program, {
                "button 1": button.service,
                "servo 1": servo.service,
            })

            const runner = new VMProgramRunner(roleMgr, program)
            await runner.startAsync()

            await testBody(tester, button, servo)
        })
    }

    test(
        "inverts when pressed",
        makeVmTest(async (tester, button, servo) => {
            servo.server.angle.setValues([50])

            button.server.down()
            await tester.waitForDelay(100)
            button.server.up()
            assert(servo.server.angle.values()[0] == -50.0)
        })
    )

    test(
        "does not invert when not pressed",
        makeVmTest(async (tester, button, servo) => {
            servo.server.angle.setValues([50])

            await tester.waitForDelay(100)
            assert(servo.server.angle.values()[0] == 50)
        })
    )

    test(
        "inverts twice when pressed twice",
        makeVmTest(async (tester, button, servo) => {
            servo.server.angle.setValues([50])

            button.server.down()
            await tester.waitForDelay(100)
            button.server.up()
            await tester.waitForDelay(100)
            button.server.down()
            await tester.waitForDelay(100)
            button.server.up()
            assert(servo.server.angle.values()[0] == 50)
        })
    )
})

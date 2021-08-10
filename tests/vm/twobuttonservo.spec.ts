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
        readFileSync("vm/suites/twobuttonservo.json", "utf8")
    )

    function makeVmTest(
        testBody: (
            tester: FastForwardTester,
            button1: CreatedServerService<ButtonServer>,
            button2: CreatedServerService<ButtonServer>,
            servo: CreatedServerService<ServoServer>
        ) => void
    ) {
        return FastForwardTester.makeTest(async tester => {
            const { button1, button2, servo } = await tester.createServices({
                button1: new ButtonServer("button", false),
                button2: new ButtonServer("button", false),
                servo: new ServoServer(),
            })
            const roleMgr = new RoleManager(tester.bus)
            bindRoles(roleMgr, program, {
                "button 1": button1.service,
                b2: button2.service,
                "servo 1": servo.service,
            })

            const runner = new VMProgramRunner(roleMgr, program)
            await runner.startAsync()

            await testBody(tester, button1, button2, servo)
        })
    }

    test(
        "sets to 10 when button1 pressed",
        makeVmTest(async (tester, button1, button2, servo) => {
            servo.server.angle.setValues([0])

            button1.server.down()
            await tester.waitForDelay(100)
            button1.server.up()
            assert(servo.server.angle.values()[0] == 10.0)
        })
    )

    test(
        "sets to 45 when button2 pressed",
        makeVmTest(async (tester, button1, button2, servo) => {
            servo.server.angle.setValues([0])

            button2.server.down()
            await tester.waitForDelay(100)
            button2.server.up()
            assert(servo.server.angle.values()[0] == 45.0)
        })
    )

    test(
        "works when button 1, then button2 pressed",
        makeVmTest(async (tester, button1, button2, servo) => {
            servo.server.angle.setValues([0])

            button1.server.down()
            await tester.waitForDelay(100)
            button1.server.up()

            button2.server.down()
            await tester.waitForDelay(100)
            button2.server.up()

            assert(servo.server.angle.values()[0] == 45.0)
        })
    )

    test(
        "works when button2, then button1 pressed",
        makeVmTest(async (tester, button1, button2, servo) => {
            servo.server.angle.setValues([0])

            button2.server.down()
            await tester.waitForDelay(100)
            button2.server.up()

            button1.server.down()
            await tester.waitForDelay(100)
            button1.server.up()

            assert(servo.server.angle.values()[0] == 10.0)
        })
    )
})

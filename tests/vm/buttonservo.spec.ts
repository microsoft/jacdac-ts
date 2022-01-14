import { suite, test } from "mocha"
import { readFileSync } from "fs"
import { VMProgram } from "../../src/vm/ir"
import { toJacScript } from "../../src/vm/ir2jacscript"
import { VMProgramRunner } from "../../src/vm/runner"
import { compile } from "../../src/jacscript/compiler"

import { makeTest } from "../jdom/fastforwardtester"
import { ButtonServer } from "../../src/servers/buttonserver"
import { RoleManager } from "../../src/jdom/rolemanager"
import { ServoServer } from "../../src/servers/servoserver"
import { bindRoles } from "./vmtester"
import { FastForwardTester } from "../jdom/fastforwardtester"
import { RegisterTester } from "../../src/tstester/registerwrapper"
import { ServoReg } from "../../jacdac-spec/dist/specconstants"

suite("button servo", () => {
    const program: VMProgram = JSON.parse(
        readFileSync("vm/suites/buttonservo.json", "utf8")
    )

    const jacscript = toJacScript(program)
    const output = jacscript.program.join("\n")
    console.log(output)

    const res = compile(
        {
            write: (fn, cont) => {},
            log: msg => { console.log(msg) },
        },
        output
    )

    function makeVmTest(
        testBody: (
            tester: FastForwardTester,
            button: ButtonServer,
            servo: ServoServer,
            servoReg: RegisterTester
        ) => void
    ) {
        return makeTest(async tester => {
            const { button, servo } = await tester.createServices({
                button: new ButtonServer("button", false),
                servo: new ServoServer(),
            })
            const roleMgr = new RoleManager(tester.bus)
            bindRoles(roleMgr, program, {
                "button_1": button.service,
                "servo_1": servo.service,
            })

            const runner = new VMProgramRunner(roleMgr, program)
            await runner.startAsync()

            const servoReg = new RegisterTester(
                servo.service.register(ServoReg.Angle)
            )
            await testBody(tester, button.server, servo.server, servoReg)
        })
    }

    test(
        "inverts when pressed",
        makeVmTest(async (tester, button, servo, servoReg) => {
            servo.angle.setValues([50])

            await tester.assertWith(servoReg.onValue(-50).hold(), async () => {
                button.down()
                await tester.waitForDelay(100)
                button.up()
                await tester.waitForDelay(100)
            })
        })
    )

    test(
        "does not invert when not pressed",
        makeVmTest(async (tester, button, servo, servoReg) => {
            servo.angle.setValues([50])

            await tester.assertWith(servoReg.hold([50, 50]), async () => {
                await tester.waitForDelay(100)
            })
        })
    )

    test(
        "inverts twice when pressed twice",
        makeVmTest(async (tester, button, servo, servoReg) => {
            servo.angle.setValues([50])

            await tester.assertWith(servoReg.onValue(-50).hold(), async () => {
                button.down()
                await tester.waitForDelay(100)
                button.up()
                await tester.waitForDelay(100)
            })

            await tester.assertWith(
                servoReg
                    .onValue(50, {
                        precondition: -50,
                    })
                    .hold(),
                async () => {
                    button.down()
                    await tester.waitForDelay(100)
                    button.up()
                    await tester.waitForDelay(100)
                }
            )
        })
    )
})

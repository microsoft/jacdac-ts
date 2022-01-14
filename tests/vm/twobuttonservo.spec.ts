import { suite, test } from "mocha"
import { readFileSync } from "fs"
import { VMProgram } from "../../src/vm/ir"
import { VMProgramRunner } from "../../src/vm/runner"
import { toJacScript } from "../../src/vm/ir2jacscript"
import { compile } from "../../src/jacscript/compiler"

import { makeTest } from "../jdom/fastforwardtester"
import { ButtonServer } from "../../src/servers/buttonserver"
import { RoleManager } from "../../src/jdom/rolemanager"
import { ServoServer } from "../../src/servers/servoserver"
import { bindRoles } from "./vmtester"
import { FastForwardTester } from "../jdom/fastforwardtester"
import { ServoReg } from "../../jacdac-spec/dist/specconstants"
import { RegisterTester } from "../../src/tstester/registerwrapper"

suite("button servo", () => {
    const program: VMProgram = JSON.parse(
        readFileSync("vm/suites/twobuttonservo.json", "utf8")
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
            button1: ButtonServer,
            button2: ButtonServer,
            servoReg: RegisterTester
        ) => void
    ) {
        return makeTest(async tester => {
            const { button1, button2, servo } = await tester.createServices({
                button1: new ButtonServer("button", false),
                button2: new ButtonServer("button", false),
                servo: new ServoServer(),
            })
            const roleMgr = new RoleManager(tester.bus)
            bindRoles(roleMgr, program, {
                "button_1": button1.service,
                "b2": button2.service,
                "servo_1": servo.service,
            })

            const runner = new VMProgramRunner(roleMgr, program)
            await runner.startAsync()

            const servoReg = new RegisterTester(
                servo.service.register(ServoReg.Angle)
            )
            await testBody(tester, button1.server, button2.server, servoReg)
        })
    }

    test(
        "sets to 10 when button1 pressed",
        makeVmTest(async (tester, button1, button2, servoReg) => {
            await tester.assertWith(servoReg.onValue(10).hold(), async () => {
                button1.down()
                await tester.waitForDelay(100)
                button1.up()
                await tester.waitForDelay(100)
            })
        })
    )

    test(
        "sets to 45 when button2 pressed",
        makeVmTest(async (tester, button1, button2, servoReg) => {
            await tester.assertWith(servoReg.onValue(45).hold(), async () => {
                button2.down()
                await tester.waitForDelay(100)
                button2.up()
                await tester.waitForDelay(100)
            })
        })
    )

    test(
        "works when button 1, then button2 pressed",
        makeVmTest(async (tester, button1, button2, servoReg) => {
            await tester.assertWith(servoReg.onValue(10).hold(), async () => {
                button1.down()
                await tester.waitForDelay(100)
                button1.up()
                await tester.waitForDelay(100)
            })

            await tester.assertWith(
                servoReg
                    .onValue(45, {
                        precondition: 10,
                    })
                    .hold(),
                async () => {
                    button2.down()
                    await tester.waitForDelay(100)
                    button2.up()
                    await tester.waitForDelay(100)
                }
            )
        })
    )

    test(
        "works when button2, then button1 pressed",
        makeVmTest(async (tester, button1, button2, servoReg) => {
            await tester.assertWith(servoReg.onValue(45).hold(), async () => {
                button2.down()
                await tester.waitForDelay(100)
                button2.up()
                await tester.waitForDelay(100)
            })

            await tester.assertWith(
                servoReg
                    .onValue(10, {
                        precondition: 45, // shouldn't change from before
                    })
                    .hold(),
                async () => {
                    button1.down()
                    await tester.waitForDelay(100)
                    button1.up()
                    await tester.waitForDelay(100)
                }
            )
        })
    )
})

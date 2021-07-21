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
} from "../jdom/tester"
import ButtonServer from "../../src/servers/buttonserver"
import RoleManager from "../../src/servers/rolemanager"
import ServoServer from "../../src/servers/servoserver"
import { assert } from "../../src/jdom/utils"
import { bindRoles } from "./vmtester"

suite("button servo", () => {
    const program: VMProgram = JSON.parse(
        readFileSync("vm/suites/buttonservo.json", "utf8")
    )

    async function withHarness(
        testBody: (
            bus: JDBus,
            button: CreatedServerService<ButtonServer>,
            servo: CreatedServerService<ServoServer>
        ) => void
    ) {
        await withTestBus(async bus => {
            const { button, servo } = await createServices(bus, {
                button: new ButtonServer("button", false),
                servo: new ServoServer(),
            })
            const roleMgr = new RoleManager(bus)
            bindRoles(roleMgr, program, {
                "button 1": button.service,
                "servo 1": servo.service,
            })

            const runner = new VMProgramRunner(roleMgr, program)
            await runner.startAsync()

            await testBody(bus, button, servo)
        })
    }

    test("inverts when pressed", async () => {
        await withHarness(async (bus, button, servo) => {
            servo.server.angle.setValues([50])

            button.server.down()
            await runForDelay(bus, 100)
            button.server.up()
            assert(servo.server.angle.values()[0] == -50.0)
        })
    })

    test("does not invert when not pressed", async () => {
        await withHarness(async (bus, button, servo) => {
            servo.server.angle.setValues([50])

            await runForDelay(bus, 100)
            assert(servo.server.angle.values()[0] == 50)
        })
    })

    test("inverts twice when pressed twice", async () => {
        await withHarness(async (bus, button, servo) => {
            servo.server.angle.setValues([50])

            button.server.down()
            await runForDelay(bus, 100)
            button.server.up()
            await runForDelay(bus, 100)
            button.server.down()
            await runForDelay(bus, 100)
            button.server.up()
            assert(servo.server.angle.values()[0] == 50)
        })
    })
})

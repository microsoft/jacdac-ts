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
        readFileSync("vm/suites/twobuttonservo.json", "utf8")
    )

    async function withHarness(
        testBody: (
            bus: JDBus,
            button1: CreatedServerService<ButtonServer>,
            button2: CreatedServerService<ButtonServer>,
            servo: CreatedServerService<ServoServer>
        ) => void
    ) {
        await withTestBus(async bus => {
            const { button1, button2, servo } = await createServices(bus, {
                button1: new ButtonServer("button", false),
                button2: new ButtonServer("button", false),
                servo: new ServoServer(),
            })
            const roleMgr = new RoleManager(bus)
            bindRoles(roleMgr, program, {
                "button 1": button1.service,
                "b2": button2.service,
                "servo 1": servo.service,
            })

            const runner = new VMProgramRunner(roleMgr, program)
            await runner.startAsync()

            await testBody(bus, button1, button2, servo)
        })
    }

    test("sets to 10 when button1 pressed", async () => {
        await withHarness(async (bus, button1, button2, servo) => {
            servo.server.angle.setValues([0])

            button1.server.down()
            await runForDelay(bus, 100)
            button1.server.up()
            assert(servo.server.angle.values()[0] == 10.0)
        })
    })

    test("sets to 45 when button2 pressed", async () => {
        await withHarness(async (bus, button1, button2, servo) => {
            servo.server.angle.setValues([0])

            button2.server.down()
            await runForDelay(bus, 100)
            button2.server.up()
            assert(servo.server.angle.values()[0] == 45.0)
        })
    })

    test("works when button 1, then button2 pressed", async () => {
        await withHarness(async (bus, button1, button2, servo) => {
            servo.server.angle.setValues([0])

            button1.server.down()
            await runForDelay(bus, 100)
            button1.server.up()

            button2.server.down()
            await runForDelay(bus, 100)
            button2.server.up()

            assert(servo.server.angle.values()[0] == 45.0)
        })
    })

    test("works when button2, then button1 pressed", async () => {
        await withHarness(async (bus, button1, button2, servo) => {
            servo.server.angle.setValues([0])

            button2.server.down()
            await runForDelay(bus, 100)
            button2.server.up()

            button1.server.down()
            await runForDelay(bus, 100)
            button1.server.up()

            assert(servo.server.angle.values()[0] == 10.0)
        })
    })
})

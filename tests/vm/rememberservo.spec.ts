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

suite("remember servo", () => {
    const program: VMProgram = JSON.parse(
        readFileSync("vm/suites/rememberservo.json", "utf8")
    )

    async function withHarness(
        testBody: (
            bus: JDBus,
            recall: CreatedServerService<ButtonServer>,
            set: CreatedServerService<ButtonServer>,
            servo: CreatedServerService<ServoServer>
        ) => void
    ) {
        await withTestBus(async bus => {
            const { recall, set, servo } = await createServices(bus, {
                recall: new ButtonServer("button", false),
                set: new ButtonServer("button", false),
                servo: new ServoServer(),
            })
            const roleMgr = new RoleManager(bus)
            bindRoles(roleMgr, program, {
                recall: recall.service,
                set: set.service,
                "servo 1": servo.service,
            })

            const runner = new VMProgramRunner(roleMgr, program)
            await runner.startAsync()

            await testBody(bus, recall, set, servo)
        })
    }

    test("sets and recalls", async () => {
        await withHarness(async (bus, recall, set, servo) => {
            servo.server.angle.setValues([50])
            set.server.down()
            await runForDelay(bus, 100)
            set.server.up()

            servo.server.angle.setValues([0]) // make sure the difference on recall is visible
            assert(servo.server.angle.values()[0] == 0.0)

            recall.server.down()
            await runForDelay(bus, 100)
            recall.server.up()
            assert(servo.server.angle.values()[0] == 50.0)
        })
    })

    test("sets, re-sets, and recalls", async () => {
        await withHarness(async (bus, recall, set, servo) => {
            servo.server.angle.setValues([50])
            set.server.down()
            await runForDelay(bus, 100)
            set.server.up()

            await runForDelay(bus, 100)
            servo.server.angle.setValues([-50])
            set.server.down()
            await runForDelay(bus, 100)
            set.server.up()

            servo.server.angle.setValues([0]) // make sure the difference on recall is visible
            assert(servo.server.angle.values()[0] == 0.0)

            recall.server.down()
            await runForDelay(bus, 100)
            recall.server.up()
            assert(servo.server.angle.values()[0] == -50.0)
        })
    })
})

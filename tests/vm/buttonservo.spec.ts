import { suite, test } from "mocha"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { VMProgram } from "../../src/vm/ir"
import { VMProgramRunner } from "../../src/vm/runner"
import { JDBus } from "../../src/jdom/bus"

import { withTestBus, createServices, CreatedServerService } from "../jdom/tester"
import ButtonServer from "../../src/servers/buttonserver"
import RoleManager from "../../src/servers/rolemanager"
import ServoServer from "../../src/servers/servoserver"
import { FastForwardScheduler } from "../jdom/scheduler"

suite("button servo", () => {
    const program: VMProgram = JSON.parse(readFileSync("vm/suites/buttonservo.json", "utf8"))
            
    async function withHarness(testBody: (bus: JDBus, button: CreatedServerService<ButtonServer>, servo: CreatedServerService<ServoServer>) => void) {
        await withTestBus(async bus => {
            const { button, servo } = await createServices(bus, {
                button: new ButtonServer("button", false),
                servo: new ServoServer(),
            })
            const roleMgr = new RoleManager(bus)
            roleMgr.setRoles([
                {
                    role: "button 1",
                    serviceClass: button.service.serviceClass,
                    preferredDeviceId: button.service.device.deviceId,
                    service: button.service
                },
                {
                    role: "servo 1",
                    serviceClass: servo.service.serviceClass,
                    preferredDeviceId: servo.service.device.deviceId,
                    service: servo.service
                },
            ])

            const runner = new VMProgramRunner(roleMgr, program)
            await runner.startAsync()

            await testBody(bus, button, servo)
        })
    }

    test("inverts when pressed", async () => {
        await withHarness(async (bus, button, servo) => {
            servo.server.angle.setValues([50])
            await (bus.scheduler as FastForwardScheduler).runForDelay(100)
            console.log(servo.server.angle.values())
            
            button.server.down()
            await (bus.scheduler as FastForwardScheduler).runForDelay(100)
            button.server.up()
            console.log(servo.server.angle.values())
        })
    })
})

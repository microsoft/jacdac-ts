import { suite, test } from "mocha"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { VMProgram } from "../../src/vm/ir"
import { VMProgramRunner } from "../../src/vm/runner"

import { withTestBus, createServices } from "../jdom/tester"
import ButtonServer from "../../src/servers/buttonserver"
import RoleManager from "../../src/servers/rolemanager"
import ServoServer from "../../src/servers/servoserver"

suite("vm", () => {
    const filePath = "vm/suites/buttonservo.json"
    test(filePath, async () => {
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

            // TODO parse roles from VMProgram

            // TODO: spin up bus and RoleManager
            // Create servers for client devices requested in the VMProgram, and bind roles
            const program: VMProgram = JSON.parse(readFileSync(filePath, "utf8"))
            
            const runner = new VMProgramRunner(roleMgr, program)
            await runner.startAsync()

            // await runner.runAsync()  // private
        })
    })
})

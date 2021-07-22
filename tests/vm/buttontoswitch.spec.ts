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
import { bindRoles, getRoles } from "./vmtester"
import { SwitchReg } from "../../jacdac-spec/dist/specconstants"
import { EVENT } from "../../src/jdom/constants"
import { JDService } from "../../src/jdom/service"
import { JDEvent } from "../../src/jdom/event"

suite("button servo", () => {
    const program: VMProgram = JSON.parse(
        readFileSync("vm/suites/buttontoswitch.json", "utf8")
    )

    async function withHarness(
        testBody: (
            bus: JDBus,
            button: CreatedServerService<ButtonServer>,
            sw: JDService
        ) => void
    ) {
        await withTestBus(async bus => {
            const { button } = await createServices(bus, {
                button: new ButtonServer("button", false),
            })
            const roleMgr = new RoleManager(bus)
            bindRoles(roleMgr, program, {
                "button 1": button.service,
            })

            const runner = new VMProgramRunner(roleMgr, program)
            await runner.startAsync()

            const { "switch server 1": sw } = await getRoles(roleMgr, program)

            await testBody(bus, button, sw)
        })
    }

    test("inverts when pressed", async () => {
        await withHarness(async (bus, button, sw) => {
            sw.on(EVENT, (ev: JDEvent) => {
                console.log(`${bus.timestamp} sw event ${ev.code}`)
            })
            bus.on(EVENT, (ev: JDEvent) => {
                console.log(`${bus.timestamp} bus event ${ev.code}`)
            })
            console.log(sw.specification)
            console.log(sw.specification.name)

            console.log(sw.register(SwitchReg.Active).data)
            console.log(sw.register(SwitchReg.Active).unpackedValue)

            button.server.down()
            await runForDelay(bus, 60)
            button.server.up()
            await runForDelay(bus, 60)
            console.log(sw.register(SwitchReg.Active).data)
            console.log(sw.register(SwitchReg.Active).unpackedValue)

            button.server.down()
            await runForDelay(bus, 60)
            button.server.up()
            await runForDelay(bus, 60)
            console.log(sw.register(SwitchReg.Active).data)
            console.log(sw.register(SwitchReg.Active).unpackedValue)
        })
    })
})

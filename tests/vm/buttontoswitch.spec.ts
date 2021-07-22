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
    nextEventFrom,
} from "../jdom/tester"
import ButtonServer from "../../src/servers/buttonserver"
import RoleManager from "../../src/servers/rolemanager"
import ServoServer from "../../src/servers/servoserver"
import { assert } from "../../src/jdom/utils"
import { bindRoles, getRoles } from "./vmtester"
import { SwitchEvent, SwitchReg } from "../../jacdac-spec/dist/specconstants"
import { EVENT } from "../../src/jdom/constants"
import { JDService } from "../../src/jdom/service"
import { JDEvent } from "../../src/jdom/event"

suite("button to switch adapter", () => {
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

    test("switch starts off", async () => {
        await withHarness(async (bus, button, sw) => {
            console.log(`starting data=${sw.register(SwitchReg.Active).data} unpacked=${sw.register(SwitchReg.Active).unpackedValue}`)
            assert(sw.register(SwitchReg.Active).unpackedValue[0] == 0)
        })
    })

    test("toggles when pressed", async () => {
        await withHarness(async (bus, button, sw) => {
            sw.on(EVENT, (ev: JDEvent) => {
                console.log(`sw service event at ${bus.timestamp}: code=${ev.code}`)
            })
            bus.on(EVENT, (ev: JDEvent) => {
                console.log(`bus event at ${bus.timestamp}: code=${ev.code}`)
            })


            button.server.down()
            assert(
                (
                    await nextEventFrom(sw, {
                        within: 100
                    })
                ).code == SwitchEvent.On
            )

            console.log(`post-press data=${sw.register(SwitchReg.Active).data} unpacked=${sw.register(SwitchReg.Active).unpackedValue}`)
            assert(sw.register(SwitchReg.Active).unpackedValue[0] == 1)

            button.server.down()
            // TODO: can we check for absence of an event?
            assert(sw.register(SwitchReg.Active).unpackedValue[0] == 1)
        })
    })
})

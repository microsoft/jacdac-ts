import { suite, test } from "mocha"
import { readFileSync } from "fs"
import { VMProgram } from "../../src/vm/ir"
import { VMProgramRunner } from "../../src/vm/runner"

import { CreatedServerService } from "../jdom/fastforwardtester"
import ButtonServer from "../../src/servers/buttonserver"
import RoleManager from "../../src/servers/rolemanager"
import { assert } from "../../src/jdom/utils"
import { bindRoles, getRoles } from "./vmtester"
import { SwitchEvent, SwitchReg } from "../../jacdac-spec/dist/specconstants"
import { EVENT } from "../../src/jdom/constants"
import { JDEvent } from "../../src/jdom/event"
import { FastForwardTester } from "../jdom/fastforwardtester"
import { ServiceTester } from "../../src/tstester/servicewrapper"

suite("button to switch adapter", () => {
    const program: VMProgram = JSON.parse(
        readFileSync("vm/suites/buttontoswitch.json", "utf8")
    )

    function makeVmTest(
        testBody: (
            tester: FastForwardTester,
            button: CreatedServerService<ButtonServer>,
            sw: ServiceTester
        ) => void
    ) {
        return FastForwardTester.makeTest(async tester => {
            const { button } = await tester.createServices({
                button: new ButtonServer("button", false),
            })
            const roleMgr = new RoleManager(tester.bus)
            bindRoles(roleMgr, program, {
                "button 1": button.service,
            })

            const runner = new VMProgramRunner(roleMgr, program)
            // start up the device
            await runner.device()
            const { "switch server 1": sw } = await getRoles(tester, roleMgr, program)

            // start up the VM
            await runner.startAsync()
            await testBody(tester, button, new ServiceTester(sw))
        })
    }

    test(
        "switch starts off",
        makeVmTest(async (tester, button, sw) => {
            await sw.register(SwitchReg.Active).register.refresh()
            console.log(
                `starting data=${
                    sw.register(SwitchReg.Active).register.data
                } unpacked=${
                    sw.register(SwitchReg.Active).register.unpackedValue
                }`
            )
            assert(sw.register(SwitchReg.Active).register.unpackedValue[0] == 0)
        })
    )

    test(
        "toggles when pressed",
        makeVmTest(async (tester, button, sw) => {
            sw.service.on(EVENT, (ev: JDEvent) => {
                console.log(
                    `sw service event at ${tester.bus.timestamp}: code=${ev.code}`
                )
            })
            tester.bus.on(EVENT, (ev: JDEvent) => {
                console.log(
                    `bus event at ${tester.bus.timestamp}: code=${ev.code} device=${ev.service.device.shortId}`
                )
            })
            console.log(`sw device = ${sw.service.device.shortId}`)

            button.server.down()

            await tester.waitForAll(
                [
                    sw.nextEvent(SwitchEvent.On),
                    // TODO needs register to start streaming
                    // sw.register(SwitchReg.Active).onUpdate({triggerRange: [0.5, 1]})
                ],
                { within: 100, synchronization: 50 }
            )

            await sw.register(SwitchReg.Active).register.refresh()
            console.log(
                `post-press data=${
                    sw.register(SwitchReg.Active).register.data
                } unpacked=${
                    sw.register(SwitchReg.Active).register.unpackedValue
                }`
            )
            assert(
                sw.register(SwitchReg.Active).register.unpackedValue[0] === 1
            )

            button.server.up()
            await tester.waitForDelay(100)
            button.server.down()
            await tester.waitForDelay(100)
            // TODO: can we check for absence of an event?
            await sw.register(SwitchReg.Active).register.refresh()
            assert(
                sw.register(SwitchReg.Active).register.unpackedValue[0] === 0
            )
        })
    )
})

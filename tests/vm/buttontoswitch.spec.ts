import { suite, test } from "mocha"
import { readFileSync } from "fs"
import { VMProgram } from "../../src/vm/ir"
import { VMProgramRunner } from "../../src/vm/runner"

import { CreatedServerService, makeTest } from "../jdom/fastforwardtester"
import ButtonServer from "../../src/servers/buttonserver"
import RoleManager from "../../src/servers/rolemanager"
import { bindRoles, getRoles } from "./vmtester"
import { SwitchEvent, SwitchReg } from "../../jacdac-spec/dist/specconstants"
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
        return makeTest(async tester => {
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
            const { "switch server 1": sw } = await getRoles(
                tester,
                roleMgr,
                program
            )

            // start up the VM
            await runner.startAsync()
            await testBody(tester, button, new ServiceTester(sw))
        })
    }

    test(
        "switch starts off",
        makeVmTest(async (tester, button, sw) => {
            await tester.waitFor(
                sw
                    .register(SwitchReg.Active)
                    .onValue(0),
                { within: 100 }
            )
        })
    )

    test(
        "toggles when pressed",
        makeVmTest(async (tester, button, sw) => {
            button.server.down()
            await tester.waitFor(
                [
                    sw.nextEvent(SwitchEvent.On),
                    sw
                        .register(SwitchReg.Active)
                        .onValue(1),
                ],
                { within: 110, synchronization: 110 }
            )

            button.server.up()
            await tester.waitForDelay(200)

            button.server.down()
            await tester.waitFor(
                [
                    sw.nextEvent(SwitchEvent.Off),
                    sw
                        .register(SwitchReg.Active)
                        .onValue(0),
                ],
                { within: 110, synchronization: 110 }
            )
        })
    )
})

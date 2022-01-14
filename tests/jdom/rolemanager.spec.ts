import { suite, test } from "mocha"
import { SRV_BUTTON } from "../../src/jdom/constants"
import { RoleManager } from "../../src/jdom/rolemanager"
import { assert } from "../../src/jdom/utils"
import { ButtonServer } from "../../src/servers/buttonserver"
import { makeTest } from "./fastforwardtester"

suite("rolemanager", () => {
    test(
        "bind 1 button",
        makeTest(async tester => {
            const { bus } = tester
            const { button } = await tester.createServices({
                button: new ButtonServer("button", false),
            })
            const roleManager = new RoleManager(bus)
            roleManager.updateRoles([
                {
                    role: "button",
                    serviceClass: SRV_BUTTON,
                },
            ])
            assert(roleManager.isBound, "role manager not found")
            assert(
                roleManager.roles(true).find(r => r.role === "button")
                    .service === button.service
            )
        })
    ),
        test(
            "bind 2 button",
            makeTest(async tester => {
                const { bus } = tester
                await tester.createServices({
                    button: new ButtonServer("button", false),
                    button2: new ButtonServer("button2", false),
                })
                const roleManager = new RoleManager(bus)
                roleManager.updateRoles([
                    {
                        role: "button",
                        serviceClass: SRV_BUTTON,
                    },
                    {
                        role: "button2",
                        serviceClass: SRV_BUTTON,
                    },
                ])
                assert(roleManager.isBound, "role manager not found")
                const roles = roleManager.roles(true)
                assert(
                    !!roles.find(r => r.role === "button").service,
                    "button not bound"
                )
                assert(
                    !!roles.find(r => r.role === "button2").service,
                    "button2 not bound"
                )
            })
        ),
        test(
            "bind 2 button with preferences",
            makeTest(async tester => {
                const { bus } = tester
                const { button, button2 } = await tester.createServices({
                    button2: new ButtonServer("button2", false),
                    button: new ButtonServer("button", false),
                })
                const roleManager = new RoleManager(bus)
                roleManager.updateRoles([
                    {
                        role: "button",
                        serviceClass: SRV_BUTTON,
                        preferredDeviceId: button.service.device.deviceId,
                    },
                    {
                        role: "button2",
                        serviceClass: SRV_BUTTON,
                    },
                ])
                assert(roleManager.isBound, "role manager not found")
                const roles = roleManager.roles(true)
                assert(
                    roles.find(r => r.role === "button").service ===
                        button.service,
                    "button not bound"
                )
                assert(
                    roles.find(r => r.role === "button2").service ===
                        button2.service,
                    "button2 not bound"
                )
            })
        ),
        test(
            "bind 2 button with preferences, reversed",
            makeTest(async tester => {
                const { bus } = tester
                const { button, button2 } = await tester.createServices({
                    button2: new ButtonServer("button2", false),
                    button: new ButtonServer("button", false),
                })
                const roleManager = new RoleManager(bus)
                roleManager.updateRoles([
                    {
                        role: "button2",
                        serviceClass: SRV_BUTTON,
                    },
                    {
                        role: "button",
                        serviceClass: SRV_BUTTON,
                        preferredDeviceId: button.service.device.deviceId,
                    },
                ])
                assert(roleManager.isBound, "role manager not found")
                const roles = roleManager.roles(true)
                assert(
                    roles.find(r => r.role === "button").service ===
                        button.service,
                    "button not bound"
                )
                assert(
                    roles.find(r => r.role === "button2").service ===
                        button2.service,
                    "button2 not bound"
                )
            })
        ),
        test(
            "bind sep 2 button with preferences",
            makeTest(async tester => {
                const { bus } = tester
                const { button, button2 } = await tester.createServices({
                    button2: new ButtonServer("button2", false),
                    button: new ButtonServer("button", false),
                })
                const roleManager = new RoleManager(bus)
                roleManager.updateRole(
                    "button",
                    SRV_BUTTON,
                    button.service.device.deviceId
                )
                roleManager.updateRole("button2", SRV_BUTTON)
                assert(roleManager.isBound, "role manager not found")
                const roles = roleManager.roles(true)
                assert(
                    roles.find(r => r.role === "button").service ===
                        button.service,
                    "button not bound"
                )
                assert(
                    roles.find(r => r.role === "button2").service ===
                        button2.service,
                    "button2 not bound"
                )
            })
        )
    test(
        "bind sep 2 button with preferences reverse",
        makeTest(async tester => {
            const { bus } = tester
            const { button, button2 } = await tester.createServices({
                button2: new ButtonServer("button2", false),
                button: new ButtonServer("button", false),
            })
            const roleManager = new RoleManager(bus)
            roleManager.updateRole("button2", SRV_BUTTON)
            roleManager.updateRole(
                "button",
                SRV_BUTTON,
                button.service.device.deviceId
            )
            assert(roleManager.isBound, "role manager not found")
            const roles = roleManager.roles(true)
            assert(
                roles.find(r => r.role === "button").service === button.service,
                "button not bound"
            )
            assert(
                roles.find(r => r.role === "button2").service ===
                    button2.service,
                "button2 not bound"
            )
        })
    )
    test(
        "double bind reverse",
        makeTest(async tester => {
            const { bus } = tester
            const { button, button2 } = await tester.createServices({
                button2: new ButtonServer("button2", false),
                button: new ButtonServer("button", false),
            })
            const roleManager = new RoleManager(bus)
            roleManager.updateRole("button2", SRV_BUTTON)
            roleManager.updateRole(
                "button",
                SRV_BUTTON,
                button.service.device.deviceId
            )
            assert(roleManager.isBound, "role manager not found")
            const roles = roleManager.roles(true)
            assert(
                roles.find(r => r.role === "button").service === button.service,
                "button not bound"
            )
            assert(
                roles.find(r => r.role === "button2").service ===
                    button2.service,
                "button2 not bound"
            )
            roleManager.updateRole(
                "button",
                SRV_BUTTON,
                button2.service.device.deviceId
            )
            assert(
                roles.find(r => r.role === "button2").service === button.service,
                "double button not bound"
            )
            assert(
                roles.find(r => r.role === "button").service ===
                    button2.service,
                "double button2 not bound"
            )
        })
    )
})

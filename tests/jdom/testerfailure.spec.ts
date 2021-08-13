// Ensures that these failure conditions actually fail the test suite

import { suite, test } from "mocha"
import { ButtonEvent, ButtonReg } from "../../src/jdom/constants"
import ButtonServer from "../../src/servers/buttonserver"
import { WaitTimeoutError } from "../../src/tstester/base"
import { RegisterConditionError } from "../../src/tstester/registerwrapper"
import {
    ServiceNextEventError,
    ServiceTester,
} from "../../src/tstester/servicewrapper"
import { FastForwardTester, makeTest } from "./fastforwardtester"

// TODO how can this be less hacky
// If we use typeof Error as an argument type, Error is actually an interface and everything barfs
// But it's happy if we give it a class that implements Error
class DummyError extends Error {}

suite("testdriver with button server", () => {
    function makeButtonTest(
        expectedError: typeof DummyError,
        testFn: (
            tester: FastForwardTester,
            button: ButtonServer,
            buttonService: ServiceTester
        ) => void
    ) {
        return makeTest(async tester => {
            const { button } = await tester.createServices({
                button: new ButtonServer("button", false),
            })
            const service = new ServiceTester(button.service)

            let testPassed = false
            try {
                await testFn(tester, button.server, service)
                testPassed = false
            } catch (e) {
                if (!(e instanceof expectedError)) {
                    throw new Error(
                        `Expected error of type ${expectedError.name}, instead got error of type ${e.constructor.name}(${e.message})`
                    )
                }
                testPassed = true
            }
            if (!testPassed) {
                // can't throw this error in the try block
                throw new Error(
                    `Expected error of type ${expectedError.name}, did not get error`
                )
            }
        })
    }

    test(
        "should fail on incorrect next event",
        makeButtonTest(
            ServiceNextEventError,
            async (tester, button, service) => {
                button.down()
                await tester.waitFor(service.nextEvent(ButtonEvent.Up), {
                    within: 1000,
                })
            }
        )
    )

    test(
        "should fail on incorrect register precondition",
        makeButtonTest(
            RegisterConditionError,
            async (tester, button, service) => {
                const register = service.register(ButtonReg.Pressure)
                await tester.waitFor(
                    register.onValue(10, {
                        precondition: 1,  // would start at 0
                    }),
                    { within: 1000 }
                )
            }
        )
    )

    test(
        "should fail on an early event",
        makeButtonTest(WaitTimeoutError, async (tester, button, service) => {
            button.down()
            await tester.waitFor(service.nextEvent(ButtonEvent.Down), {
                after: 250,
            })
        })
    )

    test(
        "should timeout on an event that doesn't happen",
        makeButtonTest(WaitTimeoutError, async (tester, button, service) => {
            await tester.waitFor(service.nextEvent(ButtonEvent.Down), {
                within: 250,
            })
        })
    )
})

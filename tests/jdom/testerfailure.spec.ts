// Ensures that these failure conditions actually fail the test suite

import { suite, test } from "mocha"
import { ButtonEvent, ButtonReg } from "../../src/jdom/constants"
import ButtonServer from "../../src/servers/buttonserver"
import { WaitTimeoutError } from "../../src/tstester/base"
import { RegisterPreConditionError } from "../../src/tstester/registerwrapper"
import { ServiceNextEventError, ServiceTester } from "../../src/tstester/servicewrapper"
import { FastForwardBusTester, FastForwardTestDriver } from "./newtester"

// TODO how can this be less hacky
// If we use typeof Error as an argument type, Error is actually an interface and everything barfs
// But it's happy if we give it a class that implements Error
class DummyError extends Error {
}

suite("testdriver with button server", () => {
    async function runButtonTest(expectedError: typeof DummyError, testFn: (driver: FastForwardTestDriver, button: ButtonServer, buttonService: ServiceTester) => void) {
        return await FastForwardBusTester.withTestBus(async bus => {
            const { button } = await bus.createServices({
                button: new ButtonServer("button", false),
            })
            const driver = new FastForwardTestDriver(bus.bus)
            const service = new ServiceTester(button.service)

            let testPassed = false
            try {
                await testFn(driver, button.server, service)
                testPassed = false
            } catch (e) {
                if (!(e instanceof expectedError)) {
                    throw new Error(`Expected error of type ${expectedError.name}, instead got error of type ${e.constructor.name}(${e.message})`)
                }
                testPassed = true
            }
            if (!testPassed) {  // can't throw this error in the try block
                throw new Error(`Expected error of type ${expectedError.name}, did not get error`)
            }
        })
    }

    test("should fail on incorrect next event", async function () {
        await runButtonTest(ServiceNextEventError, async (driver, button, service) => {
            button.down()
            await driver.waitFor(
                    service.nextEvent(ButtonEvent.Up),
                { within: 1000 }
            )
        })
    })

    test("should fail on incorrect register precondition", async function () {
        await runButtonTest(RegisterPreConditionError, async (driver, button, service) => {
            const register = service.register(ButtonReg.Pressure)
            await driver.waitFor(
                    register.onUpdate({
                        preRequiredRange: [0.5, 1],
                        triggerRange: [10, 10] // impossible
                     }),
                { within: 1000 }
            )
        })
    })

    test("should fail on an early event", async function () {
        await runButtonTest(WaitTimeoutError, async (driver, button, service) => {
            button.down()
            await driver.waitFor(
                    service.nextEvent(ButtonEvent.Down),
                { after: 250 }
            )
        })
    })

    test("should timeout on an event that doesn't happen", async function () {
        await runButtonTest(WaitTimeoutError, async (driver, button, service) => {
            await driver.waitFor(
                    service.nextEvent(ButtonEvent.Down),
                { within: 250 }
            )
        })
    })
})

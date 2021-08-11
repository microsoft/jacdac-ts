import { PotentiometerReg } from "../jdom/constants"
import { TestDriver } from "./base"
import { ServiceTester } from "./servicewrapper"

export class PotentiometerTestRoutine {
    constructor(readonly service: ServiceTester, readonly driver: TestDriver) {}

    public async testMin() {
        const register = this.service.register(PotentiometerReg.Position)

        this.driver.log("wait for min - move slider to min")

        // TODO hold-for
        await this.driver.waitFor(
            register.onUpdate({
                triggerRange: [0, 0.1],
            })
        )
        this.driver.log("saw min")
    }

    public async testMax() {
        const register = this.service.register(PotentiometerReg.Position)

        this.driver.log("wait for max - move slider to max")

        // TODO hold-for
        await this.driver.waitFor(
            register.onUpdate({
                triggerRange: [0.9, 1],
            })
        )
        this.driver.log("saw max")
    }

    public async testSlideUp() {
        // Avoid over-use of "this" everywhere
        const register = this.service.register(PotentiometerReg.Position)

        this.driver.log("wait for slide up: slide up over ~2 seconds")

        // First one isn't time bounded to give the user time to start the rest
        await this.driver.waitFor(
            register.onUpdate({
                preRequiredRange: [0, 0.1],
                triggerRange: [0.1, 0.2],
            })
        )
        this.driver.log(`saw approx 1 / 10`)

        for (let i = 2; i < 10; i++) {
            await this.driver.waitFor(
                register.onUpdate({
                    preRequiredRange: [(i - 1) / 10.0, i / 1.0],
                    triggerRange: [i / 10.0, (i + 1) / 10.0],
                }),
                { after: 200, tolerance: 200 }
            )
            this.driver.log(`saw approx ${i + 1} / 10`)
        }

        this.driver.log(`done!`)
    }

    public async testSlideDown() {
        // Avoid over-use of "this" everywhere
        const register = this.service.register(PotentiometerReg.Position)

        this.driver.log("wait for slide down: slide down over ~2 seconds")

        // First one isn't time bounded to give the user time to start the rest
        await this.driver.waitFor(
            register.onUpdate({
                preRequiredRange: [0.9, 1.0],
                triggerRange: [0.8, 0.9],
            })
        )
        this.driver.log(`saw approx 9 / 10`)

        for (let i = 7; i >= 0; i--) {
            await this.driver.waitFor(
                register.onUpdate({
                    preRequiredRange: [(i + 1) / 10.0, (i + 2) / 10.0],
                    triggerRange: [i / 10.0, (i + 1) / 10.0],
                }),
                { after: 200, tolerance: 200 }
            )
            this.driver.log(`saw approx ${i + 1} / 10`)
        }

        this.driver.log(`done!`)
    }
}

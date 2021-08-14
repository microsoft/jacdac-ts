import { ButtonEvent, ButtonReg } from "../jdom/constants"
import { TestDriver } from "./base"
import { ServiceTester } from "./servicewrapper"

export class ButtonTestRoutine {
    constructor(readonly service: ServiceTester, readonly driver: TestDriver) {}

    public async testClick() {
        // Avoid over-use of "this" everywhere
        const service = this.service
        const register = this.service.register(ButtonReg.Pressure)

        this.driver.log("wait for down - press button")

        await this.driver.waitFor(
            [
                service.onEvent(ButtonEvent.Down).hold(),
                register
                    .onValue([0.5, 1], {
                        precondition: [0, 0.5],
                    })
                    .hold(),
            ],
            { synchronization: 50 }
        )
        this.driver.log("saw down")

        await this.driver.waitFor(
            [
                service.nextEvent(ButtonEvent.Up).hold(),
                register
                    .onValue([0, 0.5], {
                        precondition: [0.5, 1],
                    })
                    .hold(),
            ],
            { within: 500, synchronization: 50 }
        )
        this.driver.log("saw up")
    }

    public async testHold() {
        // Avoid over-use of "this" everywhere
        const service = this.service
        const register = this.service.register(ButtonReg.Pressure)

        this.driver.log("wait for down - press and hold button")

        await this.driver.waitFor(
            [
                service.onEvent(ButtonEvent.Down).hold(),
                register
                    .onValue([0.5, 1], {
                        precondition: [0, 0.5],
                    })
                    .hold(),
            ],
            { synchronization: 50 }
        )

        this.driver.log("saw down, continue holding")
        await this.driver.waitFor(
            [
                service.nextEvent(ButtonEvent.Hold).hold(),
                register.hold([0.5, 1.0]),
            ],
            { after: 500, tolerance: 100 }
        )

        this.driver.log("saw hold (1), continue holding")
        await this.driver.waitFor(
            [
                service.nextEvent(ButtonEvent.Hold).hold(),
                register.hold([0.5, 1.0]),
            ],
            { after: 500, tolerance: 100 }
        )

        this.driver.log("saw hold (2), continue holding")
        await this.driver.waitFor(
            [
                service.nextEvent(ButtonEvent.Hold).hold(),
                register.hold([0.5, 1.0]),
            ],
            { after: 500, tolerance: 100 }
        )

        this.driver.log("done, release")
        await this.driver.waitFor(
            [
                service.onEvent(ButtonEvent.Up).hold(), // ignore any continued hold events
                register.onValue([0, 0.5]).hold(),
            ],
            { synchronization: 50 }
        )

        this.driver.log("saw up")
    }
}

import { JDClient } from "../jdom/client"
import { CHANGE, SystemEvent, SystemReadingThreshold } from "../jdom/constants"
import AnalogSensorServer from "./analogsensorserver"

export class LevelDetector extends JDClient {
    private _state: number

    constructor(readonly service: AnalogSensorServer) {
        super()
        this.reset()
        if (this.service.inactiveThreshold)
            this.mount(
                this.service.inactiveThreshold.subscribe(
                    CHANGE,
                    this.reset.bind(this)
                )
            )
        if (this.service.activeThreshold)
            this.mount(
                this.service.activeThreshold.subscribe(
                    CHANGE,
                    this.reset.bind(this)
                )
            )
        this.mount(
            this.service.reading.subscribe(CHANGE, this.update.bind(this))
        )
    }

    reset() {
        this._state = SystemReadingThreshold.Neutral
    }

    update() {
        const [level] = this.service.reading.values()
        if (level === undefined) {
            this.setState(SystemReadingThreshold.Neutral)
            return
        }

        const [active] = this.service.activeThreshold?.values()
        if (active !== undefined && level >= active) {
            this.setState(SystemReadingThreshold.Active)
            return
        }

        const [inactive] = this.service.inactiveThreshold?.values()
        if (inactive !== undefined && level <= inactive) {
            this.setState(SystemReadingThreshold.Inactive)
            return
        }

        // neutral
        this.setState(SystemReadingThreshold.Neutral)
    }

    private setState(state: number) {
        if (state === this._state) return

        this._state = state
        switch (state) {
            case SystemReadingThreshold.Active:
                this.service.sendEvent(SystemEvent.Active)
                break
            case SystemReadingThreshold.Inactive:
                this.service.sendEvent(SystemEvent.Inactive)
                break
            case SystemReadingThreshold.Neutral:
                this.service.sendEvent(SystemEvent.Neutral)
                break
        }
    }
}

import {
    CHANGE,
    MagneticFieldLevelEvent,
    MagneticFieldLevelReg,
    MagneticFieldLevelVariant,
    SRV_MAGNETIC_FIELD_LEVEL,
    SystemReadingThreshold,
} from "../jdom/constants"
import { JDServerOptions } from "../jdom/servers/serviceserver"
import { SensorServer } from "./sensorserver"

export interface MagneticFieldLevelServerOptions extends JDServerOptions {
    variant: MagneticFieldLevelVariant
}

export class MagneticFieldLevelServer extends SensorServer<[number]> {
    private _state = SystemReadingThreshold.Neutral

    static ACTIVE_THRESHOLD = 0.3
    static INACTIVE_THRESHOLD = 0.1

    constructor(options: MagneticFieldLevelServerOptions) {
        super(SRV_MAGNETIC_FIELD_LEVEL, {
            ...options,
            readingValues: [0],
        })

        this.reading.on(CHANGE, this.update.bind(this))
    }

    active() {
        this.reading.setValues([1])
    }

    inactive() {
        this.reading.setValues([0])
    }

    get variant() {
        const reg = this.register(MagneticFieldLevelReg.Variant)
        const [v] = reg.values() as [MagneticFieldLevelVariant]
        return v
    }

    private update() {
        const [strength] = this.reading.values()
        if (Math.abs(strength) >= MagneticFieldLevelServer.ACTIVE_THRESHOLD) {
            this.setState(SystemReadingThreshold.Active)
        } else if (
            Math.abs(strength) <= MagneticFieldLevelServer.INACTIVE_THRESHOLD
        ) {
            this.setState(SystemReadingThreshold.Inactive)
        } else this.setState(SystemReadingThreshold.Neutral)
    }

    private setState(state: number) {
        if (state === this._state) return

        const variant = this.variant
        this._state = state
        switch (state) {
            case SystemReadingThreshold.Active:
                this.sendEvent(MagneticFieldLevelEvent.Active)
                break
            case SystemReadingThreshold.Inactive:
                this.sendEvent(MagneticFieldLevelEvent.Inactive)
                break
        }
    }
}

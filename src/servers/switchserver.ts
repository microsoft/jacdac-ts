import {
    SRV_SWITCH,
    SwitchEvent,
    SwitchReg,
    SwitchVariant,
} from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { SensorServer } from "./sensorserver"

export class SwitchServer extends SensorServer<[boolean]> {
    readonly variant: JDRegisterServer<[SwitchVariant]>

    constructor(options?: { variant?: SwitchVariant }) {
        super(SRV_SWITCH, { readingValues: [false], streamingInterval: 50 })
        const { variant } = options || {}

        this.variant = this.addRegister(
            SwitchReg.Variant,
            variant !== undefined ? [variant] : undefined,
        )
    }

    async toggle() {
        const [v] = this.reading.values()
        if (!v) await this.switchOn()
        else await this.switchOff()
    }

    async switchOn() {
        const [v] = this.reading.values()
        if (!v) {
            this.reading.setValues([true])
            await this.sendEvent(SwitchEvent.On)
        }
    }

    async switchOff() {
        const [v] = this.reading.values()
        if (v) {
            this.reading.setValues([false])
            await this.sendEvent(SwitchEvent.Off)
        }
    }
}

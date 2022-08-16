import {
    CHANGE,
    PowerPowerStatus,
    PowerReg,
    SRV_POWER,
} from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer, JDServerOptions } from "../jdom/servers/serviceserver"

export class PowerServer extends JDServiceServer {
    readonly allowed: JDRegisterServer<[boolean]>
    readonly maxPower: JDRegisterServer<[number]>
    readonly powerStatus: JDRegisterServer<[PowerPowerStatus]>
    readonly currentDraw: JDRegisterServer<[number]>

    constructor(options?: JDServerOptions) {
        super(SRV_POWER, options)
        this.allowed = this.addRegister<[boolean]>(PowerReg.Allowed, [false])
        this.maxPower = this.addRegister<[number]>(PowerReg.MaxPower, [500])
        this.powerStatus = this.addRegister<[PowerPowerStatus]>(
            PowerReg.PowerStatus,
            [PowerPowerStatus.Disallowed]
        )
        this.currentDraw = this.addRegister<[number]>(PowerReg.CurrentDraw, [0])

        this.allowed.on(CHANGE, this.handleAllowedChange.bind(this))
    }

    private handleAllowedChange() {
        const allowed = !!this.allowed.values()[0]
        if (allowed) {
            this.powerStatus.setValues([PowerPowerStatus.Powering])
            this.currentDraw.setValues([250])
        } else {
            this.powerStatus.setValues([PowerPowerStatus.Disallowed])
            this.currentDraw.setValues([0])
        }
    }
}

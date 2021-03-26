import { PowerReg, SRV_POWER } from "../jdom/constants"
import RegisterHost from "../jdom/registerhost"
import ServiceHost, { ServiceHostOptions } from "../jdom/servicehost"

export default class PowerServiceHost extends ServiceHost {
    readonly enabled: RegisterHost<[boolean]>
    readonly maxPower: RegisterHost<[number]>
    readonly overload: RegisterHost<[boolean]>

    constructor(options?: ServiceHostOptions) {
        super(SRV_POWER, options)

        this.enabled = this.addRegister<[boolean]>(PowerReg.Enabled, [false])
        this.maxPower = this.addRegister<[number]>(PowerReg.MaxPower, [500])
        this.overload = this.addRegister<[boolean]>(PowerReg.Overload, [false])
    }
}
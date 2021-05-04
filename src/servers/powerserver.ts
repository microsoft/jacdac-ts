import { PowerReg, SRV_POWER } from "../jdom/constants"
import JDRegisterServer from "../jdom/registerserver"
import JDServiceServer, { ServerOptions } from "../jdom/serviceserver"

export default class PowerServer extends JDServiceServer {
    readonly enabled: JDRegisterServer<[boolean]>
    readonly maxPower: JDRegisterServer<[number]>
    readonly overload: JDRegisterServer<[boolean]>

    constructor(options?: ServerOptions) {
        super(SRV_POWER, options)

        this.enabled = this.addRegister<[boolean]>(PowerReg.Enabled, [false])
        this.maxPower = this.addRegister<[number]>(PowerReg.MaxPower, [500])
        this.overload = this.addRegister<[boolean]>(PowerReg.Overload, [false])
    }
}

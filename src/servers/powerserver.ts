import { PowerReg, SRV_POWER } from "../jdom/constants"
import JDRegisterServer from "../jdom/servers/registerserver"
import JDServiceServer, { JDServerOptions } from "../jdom/servers/serviceserver"

export default class PowerServer extends JDServiceServer {
    readonly enabled: JDRegisterServer<[boolean]>
    readonly maxPower: JDRegisterServer<[number]>
    readonly overload: JDRegisterServer<[boolean]>

    constructor(options?: JDServerOptions) {
        super(SRV_POWER, options)
        this.enabled = this.addRegister<[boolean]>(PowerReg.Allowed, [false])
        this.maxPower = this.addRegister<[number]>(PowerReg.MaxPower, [500])
        this.overload = this.addRegister<[boolean]>(PowerReg.PowerStatus, [
            false,
        ])
    }
}

import { SRV_TRAFFIC_LIGHT, TrafficLightReg } from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer, JDServerOptions } from "../jdom/servers/serviceserver"

export class TrafficLightServer extends JDServiceServer {
    readonly red: JDRegisterServer<[boolean]>
    readonly yellow: JDRegisterServer<[boolean]>
    readonly green: JDRegisterServer<[boolean]>

    constructor(options?: JDServerOptions) {
        super(SRV_TRAFFIC_LIGHT, options)

        this.red = this.addRegister(TrafficLightReg.Red, [true])
        this.yellow = this.addRegister(TrafficLightReg.Yellow, [false])
        this.green = this.addRegister(TrafficLightReg.Green, [false])
    }
}

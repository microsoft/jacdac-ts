import { SRV_TRAFFIC_LIGHT, TrafficLightReg } from "../jdom/constants"
import JDRegisterServer from "../jdom/registerserver"
import JDServiceServer, { ServerOptions } from "../jdom/serviceserver"

export default class TrafficLightServer extends JDServiceServer {
    readonly red: JDRegisterServer<[boolean]>
    readonly orange: JDRegisterServer<[boolean]>
    readonly green: JDRegisterServer<[boolean]>

    constructor(options?: ServerOptions) {
        super(SRV_TRAFFIC_LIGHT, options)

        this.red = this.addRegister(TrafficLightReg.Red, [true])
        this.orange = this.addRegister(TrafficLightReg.Orange, [false])
        this.green = this.addRegister(TrafficLightReg.Green, [false])
    }
}

import { MotorReg, SRV_MOTOR } from "../jdom/constants"
import JDRegisterServer from "../jdom/registerserver"
import JDServiceServer from "../jdom/serviceserver"

export default class MotorServer extends JDServiceServer {
    readonly duty: JDRegisterServer<[number]>
    readonly enabled: JDRegisterServer<[boolean]>
    readonly loadTorque: JDRegisterServer<[number]>
    readonly loadSpeed: JDRegisterServer<[number]>

    constructor(instanceName?: string) {
        super(SRV_MOTOR, { instanceName })

        this.duty = this.addRegister<[number]>(MotorReg.Duty, [0])
        this.enabled = this.addRegister<[boolean]>(MotorReg.Enabled, [false])
        this.loadTorque = this.addRegister<[number]>(MotorReg.LoadTorque)
        this.loadSpeed = this.addRegister<[number]>(MotorReg.LoadSpeed)
    }
}

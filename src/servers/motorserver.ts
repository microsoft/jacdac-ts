import { MotorReg, SRV_MOTOR } from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer } from "../jdom/servers/serviceserver"

export class MotorServer extends JDServiceServer {
    readonly speed: JDRegisterServer<[number]>
    readonly enabled: JDRegisterServer<[boolean]>
    readonly loadTorque: JDRegisterServer<[number]>
    readonly loadRotationSpeed: JDRegisterServer<[number]>

    constructor(
        instanceName?: string,
        options?: {
            loadTorque?: number
            loadRotationSpeed?: number
        },
    ) {
        super(SRV_MOTOR, { instanceName })

        const { loadTorque, loadRotationSpeed } = options || {}

        this.speed = this.addRegister<[number]>(MotorReg.Speed, [0])
        this.enabled = this.addRegister<[boolean]>(MotorReg.Enabled, [false])
        if (loadTorque)
            this.loadTorque = this.addRegister<[number]>(MotorReg.LoadTorque, [
                loadTorque,
            ])
        if (loadRotationSpeed)
            this.loadRotationSpeed = this.addRegister<[number]>(
                MotorReg.LoadRotationSpeed,
                [loadRotationSpeed],
            )
    }
}

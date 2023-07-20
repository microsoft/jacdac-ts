import { DualMotorsReg, SRV_DUAL_MOTORS } from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer } from "../jdom/servers/serviceserver"

export class DualMotorsServer extends JDServiceServer {
    readonly speed: JDRegisterServer<[number, number]>
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
        super(SRV_DUAL_MOTORS, { instanceName })

        const { loadTorque, loadRotationSpeed } = options || {}

        this.speed = this.addRegister<[number, number]>(
            DualMotorsReg.Speed,
            [0, 0],
        )
        this.enabled = this.addRegister<[boolean]>(DualMotorsReg.Enabled, [
            false,
        ])
        if (loadTorque)
            this.loadTorque = this.addRegister<[number]>(
                DualMotorsReg.LoadTorque,
                [loadTorque],
            )
        if (loadRotationSpeed)
            this.loadRotationSpeed = this.addRegister<[number]>(
                DualMotorsReg.LoadRotationSpeed,
                [loadRotationSpeed],
            )
    }
}

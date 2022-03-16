import { PowerSupplyReg, SRV_POWER_SUPPLY } from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer } from "../jdom/servers/serviceserver"

export class PowerSupplyServer extends JDServiceServer {
    readonly enabled: JDRegisterServer<[boolean]>
    readonly outputVoltage: JDRegisterServer<[number]>
    readonly minVoltage: JDRegisterServer<[number]>
    readonly maxVoltage: JDRegisterServer<[number]>

    constructor(options?: {
        outputVoltage: number
        minVoltage: number
        maxVoltage: number
    }) {
        super(SRV_POWER_SUPPLY)
        const { outputVoltage, minVoltage, maxVoltage } = options || {}

        this.enabled = this.addRegister(PowerSupplyReg.Enabled, [false])
        this.outputVoltage = this.addRegister(PowerSupplyReg.OutputVoltage, [
            outputVoltage,
        ])
        this.minVoltage = this.addRegister(PowerSupplyReg.MinimumVoltage, [
            minVoltage,
        ])
        this.maxVoltage = this.addRegister(PowerSupplyReg.MaximumVoltage, [
            maxVoltage,
        ])
    }
}

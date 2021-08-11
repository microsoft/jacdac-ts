import { DimmerReg, DimmerVariant, SRV_DIMMER } from "../jdom/constants"
import JDRegisterServer from "../jdom/registerserver"
import JDServiceServer from "../jdom/serviceserver"

export default class DimmerServer extends JDServiceServer {
    readonly intensity: JDRegisterServer<[number]>
    readonly variant: JDRegisterServer<[DimmerVariant]>

    constructor(
        instanceName?: string,
        options: { variant?: DimmerVariant } = {}
    ) {
        super(SRV_DIMMER, { instanceName })

        const { variant = DimmerVariant.Light } = options

        this.intensity = this.addRegister<[number]>(DimmerReg.Intensity, [0])
        this.variant = this.addRegister<[number]>(DimmerReg.Variant, [variant])
    }
}

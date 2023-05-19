import {
    ReflectedLightReg,
    ReflectedLightVariant,
    SRV_REFLECTED_LIGHT,
} from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDAnalogSensorServer } from "./analogsensorserver"

export class ReflectedLightServer extends JDAnalogSensorServer {
    readonly variant: JDRegisterServer<[ReflectedLightVariant]>

    constructor(options?: { variant?: ReflectedLightVariant }) {
        super(SRV_REFLECTED_LIGHT, { readingValues: [0] })
        const { variant } = options || {}

        this.variant = this.addRegister<[ReflectedLightVariant]>(
            ReflectedLightReg.Variant,
            [variant || ReflectedLightVariant.InfraredDigital]
        )
    }
}

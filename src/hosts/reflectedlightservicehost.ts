import { ReflectorLightReg, ReflectorLightVariant, SRV_REFLECTOR_LIGHT } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDSensorServiceHost from "./sensorservicehost";

export default class ReflectedLightServiceHost extends JDSensorServiceHost<[number]> {
    readonly variant: JDRegisterHost<[ReflectorLightVariant]>;

    constructor(options?: { variant?: ReflectorLightVariant }) {
        super(SRV_REFLECTOR_LIGHT, { readingValues: [0] })
        const { variant } = options || {};

        this.variant = this.addRegister<[ReflectorLightVariant]>(ReflectorLightReg.Variant, [variant || ReflectorLightVariant.InfraredDigital])
    }
}
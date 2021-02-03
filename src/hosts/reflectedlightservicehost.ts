import { ReflectedLightReg, ReflectedLightVariant, SRV_REFLECTED_LIGHT } from "../jdom/constants";
import RegisterHost from "../jdom/registerhost";
import AnalogSensorServiceHost from "./analogsensorservicehost";

export default class ReflectedLightServiceHost extends AnalogSensorServiceHost {
    readonly variant: RegisterHost<[ReflectedLightVariant]>;

    constructor(options?: { variant?: ReflectedLightVariant }) {
        super(SRV_REFLECTED_LIGHT, { readingValues: [0] })
        const { variant } = options || {};

        this.variant = this.addRegister<[ReflectedLightVariant]>(ReflectedLightReg.Variant, [variant || ReflectedLightVariant.InfraredDigital])
    }
}
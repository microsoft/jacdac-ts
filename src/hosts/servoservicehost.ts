import { ServoReg, SRV_SERVO } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export default class ServoServiceHost extends JDServiceHost {
    readonly pulse: JDRegisterHost;
    readonly enabled: JDRegisterHost;

    constructor() {
        super(SRV_SERVO);

        this.pulse = this.addRegister(ServoReg.Pulse);
        this.enabled = this.addRegister(ServoReg.Enabled);
    }
}
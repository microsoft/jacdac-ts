import { MotorReg, SRV_MOTOR } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export default class MotorServiceHost extends JDServiceHost {
    readonly duty: JDRegisterHost;
    readonly enabled: JDRegisterHost;

    constructor() {
        super(SRV_MOTOR);

        this.duty = this.addRegister(MotorReg.Duty, 0);
        this.enabled = this.addRegister(MotorReg.Enabled, false);
    }
}
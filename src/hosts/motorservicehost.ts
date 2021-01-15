import { MotorReg, SRV_MOTOR } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export default class MotorServiceHost extends JDServiceHost {
    readonly duty: JDRegisterHost<[number]>;
    readonly enabled: JDRegisterHost<[boolean]>;

    constructor() {
        super(SRV_MOTOR);

        this.duty = this.addRegister<[number]>(MotorReg.Duty);
        this.enabled = this.addRegister<[boolean]>(MotorReg.Enabled);
    }
}
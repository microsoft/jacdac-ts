import { MotorReg, SRV_MOTOR } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export default class MotorServiceHost extends JDServiceHost {
    readonly duty: JDRegisterHost<[number]>;
    readonly enabled: JDRegisterHost<[boolean]>;
    readonly loadTorque: JDRegisterHost<[number]>;
    readonly loadSpeed: JDRegisterHost<[number]>;

    constructor() {
        super(SRV_MOTOR);

        this.duty = this.addRegister<[number]>(MotorReg.Duty, [0]);
        this.enabled = this.addRegister<[boolean]>(MotorReg.Enabled, [false]);
        this.loadTorque = this.addRegister<[number]>(MotorReg.LoadTorque);
        this.loadSpeed = this.addRegister<[number]>(MotorReg.LoadSpeed);
    }
}
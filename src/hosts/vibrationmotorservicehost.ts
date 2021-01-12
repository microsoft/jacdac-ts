import { MotorReg, SRV_MOTOR, SRV_VIBRATION_MOTOR, VibrationMotorReg } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export default class VibrationMotorServiceHost extends JDServiceHost {
    readonly speed: JDRegisterHost;
    readonly enabled: JDRegisterHost;

    constructor() {
        super(SRV_VIBRATION_MOTOR);

        this.speed = this.addRegister(VibrationMotorReg.Speed, 0);
    }
}
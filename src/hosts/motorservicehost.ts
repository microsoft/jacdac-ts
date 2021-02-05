import { MotorReg, SRV_MOTOR } from "../jdom/constants";
import RegisterHost from "../jdom/registerhost";
import ServiceHost from "../jdom/servicehost";

export default class MotorServiceHost extends ServiceHost {
    readonly duty: RegisterHost<[number]>;
    readonly enabled: RegisterHost<[boolean]>;
    readonly loadTorque: RegisterHost<[number]>;
    readonly loadSpeed: RegisterHost<[number]>;

    constructor(instanceName?: string) {
        super(SRV_MOTOR, { instanceName });

        this.duty = this.addRegister<[number]>(MotorReg.Duty, [0]);
        this.enabled = this.addRegister<[boolean]>(MotorReg.Enabled, [false]);
        this.loadTorque = this.addRegister<[number]>(MotorReg.LoadTorque);
        this.loadSpeed = this.addRegister<[number]>(MotorReg.LoadSpeed);
    }
}
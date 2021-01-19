import { ServoReg, SRV_SERVO } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export default class ServoServiceHost extends JDServiceHost {
    readonly angle: JDRegisterHost<[number]>;
    readonly offset: JDRegisterHost<[number]>;
    readonly enabled: JDRegisterHost<[boolean]>;
    readonly minAngle: JDRegisterHost<[number]>;
    readonly maxAngle: JDRegisterHost<[number]>;
    readonly responseSpeed: JDRegisterHost<[number]>;
    readonly stallTorque: JDRegisterHost<[number]>;

    constructor(options?: {
        minAngle?: number,
        maxAngle?: number,
        responseSpeed?: number,
        stallTorque?: number
    }) {
        super(SRV_SERVO);
        const { minAngle, maxAngle, responseSpeed, stallTorque } = options || {};

        this.angle = this.addRegister<[number]>(ServoReg.Angle, [0]);
        this.enabled = this.addRegister<[boolean]>(ServoReg.Enabled, [false]);
        this.minAngle = this.addRegister<[number]>(ServoReg.MinAngle, minAngle !== undefined ? [minAngle] : undefined);
        this.maxAngle = this.addRegister<[number]>(ServoReg.MaxAngle, maxAngle !== undefined ? [maxAngle] : undefined);
        this.offset = this.addRegister<[number]>(ServoReg.Offset, [0]);
        this.responseSpeed = this.addRegister<[number]>(ServoReg.ResponseSpeed, responseSpeed !== undefined ? [responseSpeed] : undefined);
        this.stallTorque = this.addRegister<[number]>(ServoReg.StallTorque, stallTorque !== undefined ? [stallTorque] : undefined);
    }
}
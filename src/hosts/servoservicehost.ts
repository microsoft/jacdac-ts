import { ServoReg, SRV_SERVO } from "../jdom/constants";
import RegisterHost from "../jdom/registerhost";
import ServiceHost, { ServiceHostOptions } from "../jdom/servicehost";

export default class ServoServiceHost extends ServiceHost {
    readonly angle: RegisterHost<[number]>;
    readonly offset: RegisterHost<[number]>;
    readonly enabled: RegisterHost<[boolean]>;
    readonly minAngle: RegisterHost<[number]>;
    readonly maxAngle: RegisterHost<[number]>;
    readonly responseSpeed: RegisterHost<[number]>;
    readonly stallTorque: RegisterHost<[number]>;

    constructor(options?: {
        minAngle?: number,
        maxAngle?: number,
        responseSpeed?: number,
        stallTorque?: number
    } & ServiceHostOptions) {
        super(SRV_SERVO, options);
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
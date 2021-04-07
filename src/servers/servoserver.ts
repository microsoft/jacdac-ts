import { ServoReg, SRV_SERVO } from "../jdom/constants";
import JDRegisterServer from "../jdom/registerserver";
import JDServiceServer, { ServerOptions } from "../jdom/serviceserver";

export default class ServoServer extends JDServiceServer {
    readonly angle: JDRegisterServer<[number]>;
    readonly offset: JDRegisterServer<[number]>;
    readonly enabled: JDRegisterServer<[boolean]>;
    readonly minAngle: JDRegisterServer<[number]>;
    readonly maxAngle: JDRegisterServer<[number]>;
    readonly responseSpeed: JDRegisterServer<[number]>;
    readonly stallTorque: JDRegisterServer<[number]>;

    constructor(options?: {
        minAngle?: number,
        maxAngle?: number,
        responseSpeed?: number,
        stallTorque?: number
    } & ServerOptions) {
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
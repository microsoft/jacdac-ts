import { JoystickReg, JoystickVariant, SRV_JOYSTICK } from "../jdom/constants";
import RegisterHost from "../jdom/registerhost";
import SensorServiceHost from "./sensorservicehost";

export default class JoystickSensorServiceHost extends SensorServiceHost<[number, number]> {
    readonly variant: RegisterHost<[JoystickVariant]>;
    readonly digital: RegisterHost<[boolean]>;

    constructor(variant?: JoystickVariant, digital?: boolean) {
        super(SRV_JOYSTICK, { readingValues: [0, 0] })

        this.variant = this.addRegister<[JoystickVariant]>(JoystickReg.Variant, [variant || JoystickVariant.Thumb]);
        this.digital = this.addRegister<[boolean]>(JoystickReg.Digital, [digital || false]);
    }
}
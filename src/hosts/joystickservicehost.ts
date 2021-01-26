import { JoystickReg, JoystickVariant, SRV_JOYSTICK } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDSensorServiceHost from "./sensorservicehost";

export default class JoystickSensorServiceHost extends JDSensorServiceHost<[number, number]> {
    readonly variant: JDRegisterHost<[JoystickVariant]>;
    readonly digital: JDRegisterHost<[boolean]>;

    constructor(variant?: JoystickVariant, digital?: boolean) {
        super(SRV_JOYSTICK, { readingValues: [0, 0] })

        this.variant = this.addRegister<[JoystickVariant]>(JoystickReg.Variant, [variant || JoystickVariant.Thumb]);
        this.digital = this.addRegister<[boolean]>(JoystickReg.Digital, [digital || false]);
    }
}
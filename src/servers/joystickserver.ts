import { JoystickReg, JoystickVariant, SRV_JOYSTICK } from "../jdom/constants"
import JDRegisterServer from "../jdom/registerserver"
import SensorServer from "./sensorserver"

export default class JoystickSensorServer extends SensorServer<
    [number, number]
> {
    readonly variant: JDRegisterServer<[JoystickVariant]>
    readonly digital: JDRegisterServer<[boolean]>

    constructor(variant?: JoystickVariant, digital?: boolean) {
        super(SRV_JOYSTICK, { readingValues: [0, 0] })

        this.variant = this.addRegister<[JoystickVariant]>(
            JoystickReg.Variant,
            [variant || JoystickVariant.Thumb]
        )
        this.digital = this.addRegister<[boolean]>(JoystickReg.Digital, [
            digital || false,
        ])
    }
}

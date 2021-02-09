import { CHANGE, CompassCmd, CompassReg, SRV_COMPASS, SystemStatusCodes } from "../jdom/constants";
import RegisterHost from "../jdom/registerhost";
import AnalogSensorServiceHost from "./analogsensorservicehost";

export default class CompassServiceHost extends AnalogSensorServiceHost {
    private enabled: RegisterHost<[boolean]>;
    constructor() {
        super(SRV_COMPASS, {
            readingValues: [0],
            minReading: 0,
            maxReading: 360,
            readingError: 1
        })

        this.enabled = this.addRegister(CompassReg.Enabled, [false]);
        this.enabled.on(CHANGE, () => {
            const [status] = this.statusCode.values();
            if (status === SystemStatusCodes.CalibrationNeeded) {
                console.log("start calibration")
                this.calibrate();
            }
        })
    }
}
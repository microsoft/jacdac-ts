import { CHANGE, CompassReg, SRV_COMPASS, SystemStatusCodes } from "../jdom/constants";
import JDRegisterServer from "../jdom/registerserver";
import AnalogSensorServer from "./analogsensorserver";

export default class CompassServer extends AnalogSensorServer {
    private enabled: JDRegisterServer<[boolean]>;
    constructor() {
        super(SRV_COMPASS, {
            readingValues: [0],
            minReading: 0,
            maxReading: 360,
            readingError: [1]
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
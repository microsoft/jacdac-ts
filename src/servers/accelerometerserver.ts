import {
    AccelerometerReg,
    SRV_ACCELEROMETER,
} from "../../jacdac-spec/dist/specconstants"
import JDRegisterServer from "../jdom/servers/registerserver"
import SensorServer from "./sensorserver"

export default class AccelerometerServer extends SensorServer<
    [number, number, number]
> {
    maxForce: JDRegisterServer<[number]>

    constructor() {
        super(SRV_ACCELEROMETER, {
            readingValues: [0.5, 0.5, -(1 - (0.5 * 0.5 + 0.5 * 0.5))],
            preferredStreamingInterval: 20,
        })

        this.maxForce = this.addRegister<[number]>(AccelerometerReg.MaxForce, [
            2,
        ])
    }
}

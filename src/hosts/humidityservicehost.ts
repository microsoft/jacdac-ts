import { SRV_HUMIDITY } from "../jdom/constants";
import JDSensorServiceHost from "./sensorservicehost";

export default class HumidityServiceHost extends JDSensorServiceHost {
    constructor() {
        super(SRV_HUMIDITY, [40], 1000)
    }
}
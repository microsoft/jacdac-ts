import { SRV_HUMIDITY } from "../jdom/constants";
import JDSensorServiceHost from "./sensorservicehost";

export default class HumidityServiceHost extends JDSensorServiceHost<number> {
    constructor() {
        super(SRV_HUMIDITY, { readingValue: 40, streamingInterval: 1000 });
    }
}
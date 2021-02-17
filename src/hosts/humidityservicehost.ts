import { SRV_HUMIDITY } from "../jdom/constants";
import SensorServiceHost from "./sensorservicehost";

export default class HumidityServiceHost extends SensorServiceHost<[number]> {
    constructor() {
        super(SRV_HUMIDITY, {
            readingValues: [40],
            readingError: [0.1],
            streamingInterval: 1000
        });
    }
}
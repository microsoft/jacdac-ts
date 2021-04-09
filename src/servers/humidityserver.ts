import { SRV_HUMIDITY } from "../jdom/constants"
import SensorServer from "./sensorserver"

export default class HumidityServer extends SensorServer<[number]> {
    constructor() {
        super(SRV_HUMIDITY, {
            readingValues: [40],
            readingError: [0.1],
            streamingInterval: 1000,
        })
    }
}

import { SRV_HUMIDITY } from "../jdom/constants"
import SensorServer, { SensorServiceOptions } from "./sensorserver"

export default class HumidityServer extends SensorServer<[number]> {
    constructor(options?: SensorServiceOptions<[number]>) {
        super(SRV_HUMIDITY, {
            ...{
                readingValues: [40],
                readingError: [0.1],
                streamingInterval: 1000,
            },
            ...options,
        })
    }
}

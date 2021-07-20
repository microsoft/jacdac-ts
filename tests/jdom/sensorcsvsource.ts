import { REFRESH } from "../../src/jdom/constants"
import SensorServer from "../../src/servers/sensorserver"

/**
 * Streams data from a "CSV" into a SensorServer, using its sensorServer.reading.setValues(...)
 * interface.
 *
 * "CSV" is formatted as (for example):
 * [
 *   [  0, 24.0],
 *   [1.0, 24.1],
 *   [1.2, 23.9],
 *   ...
 * ]
 *
 * The first column is the timestamp, in ms, and the second column is the reading.
 * The number of specified registers must match exactly the number of columns.
 *
 * Note that this only writes to registers and DOES NOT generate derived events.
 * For example, if used with the button, it will not generate up and down events.
 */
export class SensorServerCsvSource {
    protected nextDataIndex = 0 // index (in this.data) of next value

    constructor(
        protected readonly sensorServer: SensorServer<[number]>,
        protected readonly data: number[][]
    ) {
        // TODO timings are only approximate, perhaps this should use bus.scheduler.setTimeout
        // instead, but that needs a bus handle and there isn't an event when a device has its
        // bus assigned.
        sensorServer.on(REFRESH, this.handleRefresh.bind(this))
    }

    protected handleRefresh() {
        const now = this.sensorServer.device.bus.timestamp

        while (
            this.nextDataIndex < this.data.length &&
            this.data[this.nextDataIndex][0] * 1000 <= now
        ) {
            const value = this.data[this.nextDataIndex][1]
            this.sensorServer.reading.setValues([value])
            this.nextDataIndex++
        }
    }
}

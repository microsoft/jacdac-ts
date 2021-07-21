import { REFRESH } from "../../src/jdom/constants"
import JDRegisterServer from "../../src/jdom/registerserver"
import JDServiceServer from "../../src/jdom/serviceserver"
import { assert } from "../../src/jdom/utils"

/**
 * Streams data from a "CSV" into a server, with a user-defined map from column name to register.
 * All registers must be on the same server.
 *
 * "CSV" is formatted as (for example):
 * [
 *   {time: 0.6, "BP95.position": 0.5},
 *   {time: 0.8, "BP95.position": 1.0},
 *   {time: 1.0, "BP95.position": 0.8},
 *   {time: 1.2, "BP95.position": 0.6},
 *   ...
 * ]
 * This is consistent with Papa Parse (used by csv.proxy.ts in jacdac-docs, see
 * https://www.papaparse.com/demo for an interactive demo) on a Jacdac recording CSV.
 * Columns without a mapped register are ignored.
 *
 * Time is specified in seconds, and there may be multiple data columns. Null cells are ignored.
 *
 * Note that this only writes to registers, and relies on other code (eg, ButtonServer's refresh)
 * to generate derived events where applicable.
 */
export class ServerCsvSource {
    protected nextDataIndex = 0 // index (in this.data) of next value
    protected server: JDServiceServer

    constructor(
        protected readonly registerMap: Record<
            string,
            JDRegisterServer<[number]>
        >,
        protected readonly data: Record<string, number>[]
    ) {
        const servers = Object.entries(registerMap).map(
            ([colName, register]) => register.service
        )
        this.server = servers[0]
        assert(
            servers.every(serverElt => serverElt == this.server),
            "all registers must be on same server"
        )

        // TODO timings are only approximate, perhaps this should use bus.scheduler.setTimeout
        // instead, but that needs a bus handle and there isn't an event when a device has its
        // bus assigned.
        this.server.on(REFRESH, this.handleRefresh.bind(this))
    }

    protected handleRefresh() {
        const now = this.server.device.bus.timestamp // in ms
        while (this.nextDataIndex < this.data.length) {
            const thisData = this.data[this.nextDataIndex]
            assert("time" in thisData, "time field missing")
            const time = thisData.time as number // in s
            assert(typeof time == "number", "time field not a number")
            if (time * 1000 > now) {
                // s to ms conversion
                break // still in the future, handle later
            }

            Object.entries(thisData).forEach(([key, value]) => {
                if (value !== null && key in this.registerMap) {
                    const register = this.registerMap[key]
                    register.setValues([value])
                } // drop unused columns
            })

            this.nextDataIndex++
        }
    }
}

import { suite, test } from "mocha"
import { ButtonEvent } from "../../src/jdom/constants";
import {withBus, nextEventFrom, nextUpdateFrom} from "./tester";
import { assert } from "../../src/jdom/utils";

import { DEVICE_CHANGE, REFRESH, SensorReg, SRV_POTENTIOMETER, SystemReg } from "../../src/jdom/constants";
import { jdpack, PackedValues } from "../../src/jdom/pack";
import JDServiceServer from "../../src/jdom/serviceserver";
import { isRegister, serviceSpecificationFromClassIdentifier } from "../../src/jdom/spec";
import SensorServer, { SensorServiceOptions } from "../../src/servers/sensorserver";



/**
 * WIP / TODO: move into its own file, that's not in the test folder.
 * 
 * A ServiceServer that loads data from a CSV-like data structure.
 * No CSV parsed here, no animals were harmed in the making of this class.
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
export class JDCsvSensorServer extends SensorServer<[number]> {
    protected nextDataIndex = 0  // index (in this.data) of next value

    constructor(
        public readonly serviceClass: number,
        protected readonly data: number[][],
        options: SensorServiceOptions<[number]>,
    ) {
        super(serviceClass, options)

        this.on(REFRESH, this.handleRefresh.bind(this))
    }

    // TODO should this have a start() function for a timestamp offset?

    protected handleRefresh() {
        const now = this.device.bus.timestamp

        while (this.nextDataIndex < this.data.length && 
            this.data[this.nextDataIndex][0] * 1000 <= now) {
            const value = this.data[this.nextDataIndex][1]
            this.reading.setValues([value])
            this.nextDataIndex++
        }   
    }
}


suite('"CSV" trace server', () => {
    test('reads from CSVs', async function() {
        const potServer = new JDCsvSensorServer(SRV_POTENTIOMETER, [
            // takes about 500ms for the bus to spin up
            [0.6, 0.5],
            [0.8, 1.0],
            [1.0, 0.8],
            [1.2, 0.6],
        ], {})

        await withBus([
            {server: potServer},
        ], async (bus, serviceMap) => {
            const potService = serviceMap.get(potServer)  // TODO boilerplate, think about how to eliminate

            await bus.delay(600 + 50 - bus.timestamp)  // 50ms tolerance for update
            assert((await nextUpdateFrom(potService.register(SystemReg.Reading)))[0] == 0.5)

            await bus.delay(800 + 50 - bus.timestamp)  // 50ms tolerance for update
            const a = (await nextUpdateFrom(potService.register(SystemReg.Reading)))[0]
            console.log(a)
            assert(a == 1.0)

            await bus.delay(1000 + 50 - bus.timestamp)  // 50ms tolerance for update
            assert((await nextUpdateFrom(potService.register(SystemReg.Reading)))[0] == 0.8)

            await bus.delay(1200 + 50 - bus.timestamp)  // 50ms tolerance for update
            assert((await nextUpdateFrom(potService.register(SystemReg.Reading)))[0] == 0.6)
        })
    })
});

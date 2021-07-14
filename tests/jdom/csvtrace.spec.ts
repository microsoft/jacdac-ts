import { DEVICE_CHANGE, REFRESH, SensorReg, SRV_POTENTIOMETER, SystemReg } from "../../src/jdom/constants";
import { jdpack, PackedValues } from "../../src/jdom/pack";
import JDServiceServer from "../../src/jdom/serviceserver";
import { isRegister, serviceSpecificationFromClassIdentifier } from "../../src/jdom/spec";
import SensorServer, { SensorServiceOptions } from "../../src/servers/sensorserver";

/**
 * A ServiceServer that loads data from a CSV-like data structure.
 * No CSV parsed here, no animals were harmed in the making of this class.
 * 
 * "CSV" is formatted as (for example):
 * [
 *   [   0, 24.0],
 *   [1000, 24.1],
 *   [1200, 23.9],
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

    protected handleRefresh() {
        const now = this.device.bus.timestamp

        while (this.nextDataIndex < this.data.length && this.data[this.nextDataIndex][0] <= now) {
            const value = this.data[this.nextDataIndex][1]
            this.reading.setValues([value])
        }   
    }
}


suite('"CSV" trace server', () => {
    test('reads from CSVs', async function() {
        const buttonServer = new JDCsvSensorServer(SRV_POTENTIOMETER, [
            [0,   0.0],
            [0.3, 0.5],
            [0.6, 1.0],
            [0.9, 0.8],
            [1.2, 0.6],
        ], {})

        await withBus([
            {server: buttonServer},
        ], async (bus, serviceMap) => {
            const busTest = new JDBusTestUtil(bus)  // TODO needs better name, also boilerplate?
            const buttonService = serviceMap.get(buttonServer)  // TODO boilerplate, think about how to eliminate

            buttonServer.down()
            assert((await busTest.nextEventWithin(buttonService, {within: 100})).code == 
                ButtonEvent.Down)

            buttonServer.up()
            assert((await busTest.nextEventWithin(buttonService, {within: 100})).code == 
                ButtonEvent.Up)
        })
    })
});

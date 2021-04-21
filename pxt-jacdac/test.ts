function jdpackTest() {
    function testOne(fmt: string, data0: any[]) {
        function checksame(a: any, b: any) {
            function fail(msg: string): never {
                debugger
                throw (`jdpack test error: ${msg} (at ${fmt}; a=${JSON.stringify(a)}; b=${JSON.stringify(b)})`)
            }

            if (a === b || JSON.stringify(a) == JSON.stringify(b))
                return
            fail("not the same")
        }

        const buf = jacdac.jdpack(fmt, data0)
        const data1 = jacdac.jdunpack(buf, fmt)
        console.log(`${JSON.stringify(data0)}->${fmt}->${buf.toHex()}->${JSON.stringify(data1)}`)
        // console.log(fmt, data0, data1, toHex(buf))
        checksame(data0, data1)
    }

    testOne("i8", [-42])
    testOne("u16", [42])
    testOne("u16 u16 i16", [42, 77, -10])
    testOne("u16 z s", [42, "foo", "bar"])
    testOne("u32 z s", [42, "foo", "bar"])
    testOne("i8 z s", [42, "foo", "bar"])
    testOne("u8 z s", [42, "foo12", "bar"])
    testOne("u8 r: u8 z", [42, [[17, "xy"], [18, "xx"]]])
    //testOne("z b", ["foo12", jacdac.stringToBuffer("bar")])
    testOne("u16 r: u16", [42, [[17], [18]]])
    testOne("i8 s[9] u16 s[10] u8", [-100, "foo", 1000, "barbaz", 250])
    testOne("i8 x[4] s[9] u16 x[2] s[10] x[3] u8", [-100, "foo", 1000, "barbaz", 250])
    testOne("u16 u16[]", [42, [17, 18]])
    testOne("u16 u16[]", [42, [18]])
    testOne("u16 u16[]", [42, []])
    testOne("u16 z[]", [42, ["foo", "bar", "bz"]])
}

// pins.A9.digitalWrite(false)

jacdac.consolePriority = ConsolePriority.Log;
jacdac.roleManagerServer.start()
jacdac.protoTestServer.start()
jacdac.start()
jacdac.loggerServer.log("test started")
modules.identify();

jdpackTest()

function addClient(cls: number, name: string) {
    console.log(`client: ${name} (${cls})`)
    new jacdac.Client(cls, name).start()
}
addClient(0x1f140409, "left_leg/acc1")
addClient(0x1473a263, "btn1")
//addClient(0x16c810b8, "small/hum")
addClient(0x1421bac7, "small/temp")
addClient(0x169c9dc6, "big/eco2")
//addClient(0x16c810b8, "big/hum")
addClient(0x1421bac7, "big/temp")
//addClient(0x16c810b8, "xsmall/hum")
addClient(0x1421bac7, "xsmall/temp")

jacdac._rolemgr.clearRoles()

namespace jacdac {
    // Service: Humidity
    export const SRV_HUMIDITY = 0x16c810b8
    export const enum HumidityReg {
        /**
         * Read-only %RH u22.10 (uint32_t). The relative humidity in percentage of full water saturation.
         *
         * ```
         * const [humidity] = jdunpack<[number]>(buf, "u22.10")
         * ```
         */
        Humidity = 0x101,

        /**
         * Read-only %RH u22.10 (uint32_t). The real humidity is between `humidity - humidity_error` and `humidity + humidity_error`.
         *
         * ```
         * const [humidityError] = jdunpack<[number]>(buf, "u22.10")
         * ```
         */
        HumidityError = 0x106,

        /**
         * Constant °C u22.10 (uint32_t). Lowest humidity that can be reported.
         *
         * ```
         * const [minHumidity] = jdunpack<[number]>(buf, "u22.10")
         * ```
         */
        MinHumidity = 0x104,

        /**
         * Constant °C u22.10 (uint32_t). Highest humidity that can be reported.
         *
         * ```
         * const [maxHumidity] = jdunpack<[number]>(buf, "u22.10")
         * ```
         */
        MaxHumidity = 0x105,
    }

}
namespace modules {
    /**
     * A sensor measuring humidity of outside environment.
     **/
    //% fixedInstances blockGap=8
    export class HumidityClient extends jacdac.SimpleSensorClient {

        private readonly _humidityError : jacdac.RegisterClient<[number]>;
        private readonly _minHumidity : jacdac.RegisterClient<[number]>;
        private readonly _maxHumidity : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_HUMIDITY, role, "u22.10");

            this._humidityError = this.addRegister<[number]>(jacdac.HumidityReg.HumidityError, "u22.10");
            this._minHumidity = this.addRegister<[number]>(jacdac.HumidityReg.MinHumidity, "u22.10");
            this._maxHumidity = this.addRegister<[number]>(jacdac.HumidityReg.MaxHumidity, "u22.10");            
        }
    

        /**
        * The relative humidity in percentage of full water saturation.
        */
        //% callInDebugger
        //% group="Environment"
        //% block="%humidity humidity"
        //% blockId=jacdac_humidity_humidity___get
        //% weight=100
        humidity(): number {
            return this.reading();
        
        }

        /**
        * The real humidity is between `humidity - humidity_error` and `humidity + humidity_error`.
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=99
        humidityError(): number {
            this.start();            
            const values = this._humidityError.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Lowest humidity that can be reported.
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=98
        minHumidity(): number {
            this.start();            
            const values = this._minHumidity.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Highest humidity that can be reported.
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=97
        maxHumidity(): number {
            this.start();            
            const values = this._maxHumidity.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the humidity changes by the given threshold value.
        */
        //% group="Environment"
        //% blockId=jacdac_humidity_on_humidity_change
        //% block="on %humidity humidity changed by %threshold"
        //% weight=96
        //% threshold.defl=1
        onHumidityChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

    
    }
    //% fixedInstance whenUsed
    export const humidity = new HumidityClient("humidity");
}

modules.humidity.start()
forever(() => {
    const h = modules.humidity.humidity()
    console.log(`humidity: ${h}`)
    pause(5000)
})

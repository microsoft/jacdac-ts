namespace modules {
    /**
     * A sensor that measures liquid/water level.
     **/
    //% fixedInstances blockGap=8
    export class WaterLevelClient extends jacdac.SimpleSensorClient {

        private readonly _variant : jacdac.RegisterClient<[jacdac.WaterLevelVariant]>;            

        constructor(role: string) {
            super(jacdac.SRV_WATER_LEVEL, role, "u0.16");

            this._variant = this.addRegister<[jacdac.WaterLevelVariant]>(jacdac.WaterLevelReg.Variant, "u8");            
        }
    

        /**
        * The reported water level.
        */
        //% callInDebugger
        //% group="Water level"
        //% block="%waterlevel level"
        //% blockId=jacdac_waterlevel_level___get
        //% weight=100
        level(): number {
            return this.reading();
        
        }

        /**
        * The type of physical sensor.
        */
        //% callInDebugger
        //% group="Water level"
        //% weight=99
        variant(): jacdac.WaterLevelVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the level changes by the given threshold value.
        */
        //% group="Water level"
        //% blockId=jacdac_waterlevel_on_level_change
        //% block="on %waterlevel level changed by %threshold"
        //% weight=98
        //% threshold.defl=0.1
        onLevelChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

    
    }
    //% fixedInstance whenUsed
    export const waterLevel = new WaterLevelClient("water Level");
}
namespace modules {
    /**
     * A soil moisture sensor.
     **/
    //% fixedInstances blockGap=8
    export class SoilMoistureClient extends jacdac.SimpleSensorClient {

        private readonly _variant : jacdac.RegisterClient<[jacdac.SoilMoistureVariant]>;            

        constructor(role: string) {
            super(jacdac.SRV_SOIL_MOISTURE, role, "u0.16");

            this._variant = this.addRegister<[jacdac.SoilMoistureVariant]>(jacdac.SoilMoistureReg.Variant, "u8");            
        }
    

        /**
        * Indicates the wetness of the soil, from ``dry`` to ``wet``.
        */
        //% callInDebugger
        //% group="Environment"
        //% block="%soilmoisture moisture"
        //% blockId=jacdac_soilmoisture_moisture___get
        //% weight=100
        moisture(): number {
            return this.reading();
        
        }

        /**
        * Describe the type of physical sensor.
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=99
        variant(): jacdac.SoilMoistureVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the moisture changes by the given threshold value.
        */
        //% group="Environment"
        //% blockId=jacdac_soilmoisture_on_moisture_change
        //% block="on %soilmoisture moisture changed by %threshold"
        //% weight=98
        //% threshold.defl=0.1
        onMoistureChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

    
    }
    //% fixedInstance whenUsed
    export const soilMoisture = new SoilMoistureClient("soil Moisture");
}
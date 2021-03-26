namespace modules {
    /**
     * A sensor that measures luminosity level.
     **/
    //% fixedInstances blockGap=8
    export class LightLevelClient extends jacdac.SimpleSensorClient {

        private readonly _variant : jacdac.RegisterClient<[jacdac.LightLevelVariant]>;            

        constructor(role: string) {
            super(jacdac.SRV_LIGHT_LEVEL, role, "u0.16");

            this._variant = this.addRegister<[jacdac.LightLevelVariant]>(jacdac.LightLevelReg.Variant, "u8");            
        }
    

        /**
        * Detect light level
        */
        //% callInDebugger
        //% group="Imaging"
        //% block="%lightlevel light level"
        //% blockId=jacdac_lightlevel_light_level___get
        //% weight=100
        lightLevel(): number {
            return this.reading();
        
        }

        /**
        * The type of physical sensor.
        */
        //% callInDebugger
        //% group="Imaging"
        //% weight=99
        variant(): jacdac.LightLevelVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the light level changes by the given threshold value.
        */
        //% group="Imaging"
        //% blockId=jacdac_lightlevel_on_light_level_change
        //% block="on %lightlevel light level changed by %threshold"
        //% weight=98
        //% threshold.defl=0.1
        onLightLevelChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

    
    }
    //% fixedInstance whenUsed
    export const lightLevel = new LightLevelClient("light Level");
}
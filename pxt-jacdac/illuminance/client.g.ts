namespace modules {
    /**
     * Detects the amount of light falling onto a given surface area.
     * 
     * Note that this is different from *luminance*, the amount of light that passes through, emits from, or reflects off an object.
     **/
    //% fixedInstances blockGap=8
    export class IlluminanceClient extends jacdac.SimpleSensorClient {

        private readonly _lightError : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_ILLUMINANCE, role, "u22.10");

            this._lightError = this.addRegister<[number]>(jacdac.IlluminanceReg.LightError, "u22.10");            
        }
    

        /**
        * The amount of illuminance, as lumens per square metre.
        */
        //% callInDebugger
        //% group="Imaging"
        //% block="%illuminance light"
        //% blockId=jacdac_illuminance_light___get
        //% weight=100
        light(): number {
            return this.reading();
        
        }

        /**
        * Error on the reported sensor value.
        */
        //% callInDebugger
        //% group="Imaging"
        //% weight=99
        lightError(): number {
            this.start();            
            const values = this._lightError.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the light changes by the given threshold value.
        */
        //% group="Imaging"
        //% blockId=jacdac_illuminance_on_light_change
        //% block="on %illuminance light changed by %threshold"
        //% weight=98
        //% threshold.defl=1
        onLightChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

    
    }
    //% fixedInstance whenUsed block="illuminance 1"
    export const illuminance1 = new IlluminanceClient("illuminance1");
}
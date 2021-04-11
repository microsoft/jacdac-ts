namespace modules {
    /**
     * A sensor that measures wind direction.
     **/
    //% fixedInstances blockGap=8
    export class WindDirectionClient extends jacdac.SimpleSensorClient {

        private readonly _windDirectionError : jacdac.RegisterClient<[number]>;
        private readonly _windDirectionOffset : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_WIND_DIRECTION, role, "u16");

            this._windDirectionError = this.addRegister<[number]>(jacdac.WindDirectionReg.WindDirectionError, "u16");
            this._windDirectionOffset = this.addRegister<[number]>(jacdac.WindDirectionReg.WindDirectionOffset, "i16");            
        }
    

        /**
        * The direction of the wind.
        */
        //% callInDebugger
        //% group="Wind direction"
        //% block="%winddirection wind direction"
        //% blockId=jacdac_winddirection_wind_direction___get
        //% weight=100
        windDirection(): number {
            return this.reading();
        
        }

        /**
        * Error on the wind direction reading
        */
        //% callInDebugger
        //% group="Wind direction"
        //% weight=99
        windDirectionError(): number {
            this.start();            
            const values = this._windDirectionError.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Offset added to direction to account for sensor calibration.
        */
        //% callInDebugger
        //% group="Wind direction"
        //% weight=98
        windDirectionOffset(): number {
            this.start();            
            const values = this._windDirectionOffset.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the wind direction changes by the given threshold value.
        */
        //% group="Wind direction"
        //% blockId=jacdac_winddirection_on_wind_direction_change
        //% block="on %winddirection wind direction changed by %threshold"
        //% weight=97
        //% threshold.defl=1
        onWindDirectionChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

    
    }
    //% fixedInstance whenUsed block="wind direction 1"
    export const windDirection1 = new WindDirectionClient("wind Direction1");
}
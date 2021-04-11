namespace modules {
    /**
     * A sensor that measures wind speed.
     **/
    //% fixedInstances blockGap=8
    export class WindSpeedClient extends jacdac.SimpleSensorClient {

        private readonly _windSpeedError : jacdac.RegisterClient<[number]>;
        private readonly _maxWindSpeed : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_WIND_SPEED, role, "u16.16");

            this._windSpeedError = this.addRegister<[number]>(jacdac.WindSpeedReg.WindSpeedError, "u16.16");
            this._maxWindSpeed = this.addRegister<[number]>(jacdac.WindSpeedReg.MaxWindSpeed, "u16.16");            
        }
    

        /**
        * The velocity of the wind.
        */
        //% callInDebugger
        //% group="Wind speed"
        //% block="%windspeed wind speed"
        //% blockId=jacdac_windspeed_wind_speed___get
        //% weight=100
        windSpeed(): number {
            return this.reading();
        
        }

        /**
        * Error on the reading
        */
        //% callInDebugger
        //% group="Wind speed"
        //% weight=99
        windSpeedError(): number {
            this.start();            
            const values = this._windSpeedError.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Maximum speed that can be measured by the sensor.
        */
        //% callInDebugger
        //% group="Wind speed"
        //% weight=98
        maxWindSpeed(): number {
            this.start();            
            const values = this._maxWindSpeed.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the wind speed changes by the given threshold value.
        */
        //% group="Wind speed"
        //% blockId=jacdac_windspeed_on_wind_speed_change
        //% block="on %windspeed wind speed changed by %threshold"
        //% weight=97
        //% threshold.defl=1
        onWindSpeedChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

    
    }
    //% fixedInstance whenUsed block="wind speed 1"
    export const windSpeed1 = new WindSpeedClient("wind Speed1");
}
namespace modules {
    /**
     * A thermometer measuring outside or inside environment.
     **/
    //% fixedInstances blockGap=8
    export class ThermometerClient extends jacdac.SimpleSensorClient {

        private readonly _minTemperature : jacdac.RegisterClient<[number]>;
        private readonly _maxTemperature : jacdac.RegisterClient<[number]>;
        private readonly _temperatureError : jacdac.RegisterClient<[number]>;
        private readonly _variant : jacdac.RegisterClient<[jacdac.ThermometerVariant]>;            

        constructor(role: string) {
            super(jacdac.SRV_THERMOMETER, role, "i22.10");

            this._minTemperature = this.addRegister<[number]>(jacdac.ThermometerReg.MinTemperature, "i22.10");
            this._maxTemperature = this.addRegister<[number]>(jacdac.ThermometerReg.MaxTemperature, "i22.10");
            this._temperatureError = this.addRegister<[number]>(jacdac.ThermometerReg.TemperatureError, "u22.10");
            this._variant = this.addRegister<[jacdac.ThermometerVariant]>(jacdac.ThermometerReg.Variant, "u8");            
        }
    

        /**
        * The temperature.
        */
        //% callInDebugger
        //% group="Environment"
        //% block="%thermometer temperature"
        //% blockId=jacdac_thermometer_temperature___get
        //% weight=100
        temperature(): number {
            return this.reading();
        
        }

        /**
        * Lowest temperature that can be reported.
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=99
        minTemperature(): number {
            this.start();            
            const values = this._minTemperature.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Highest temperature that can be reported.
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=98
        maxTemperature(): number {
            this.start();            
            const values = this._maxTemperature.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The real temperature is between `temperature - temperature_error` and `temperature + temperature_error`.
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=97
        temperatureError(): number {
            this.start();            
            const values = this._temperatureError.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Specifies the type of thermometer.
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=96
        variant(): jacdac.ThermometerVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the temperature changes by the given threshold value.
        */
        //% group="Environment"
        //% blockId=jacdac_thermometer_on_temperature_change
        //% block="on %thermometer temperature changed by %threshold"
        //% weight=95
        //% threshold.defl=1
        onTemperatureChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

    
    }
    //% fixedInstance whenUsed
    export const thermometer = new ThermometerClient("thermometer");
}
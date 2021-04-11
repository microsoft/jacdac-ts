namespace modules {
    /**
     * A thermocouple using a heat probe to gather temperatures.
     **/
    //% fixedInstances blockGap=8
    export class ThermocoupleClient extends jacdac.SimpleSensorClient {

        private readonly _minTemperature : jacdac.RegisterClient<[number]>;
        private readonly _maxTemperature : jacdac.RegisterClient<[number]>;
        private readonly _temperatureError : jacdac.RegisterClient<[number]>;
        private readonly _variant : jacdac.RegisterClient<[jacdac.ThermocoupleVariant]>;            

        constructor(role: string) {
            super(jacdac.SRV_THERMOCOUPLE, role, "i22.10");

            this._minTemperature = this.addRegister<[number]>(jacdac.ThermocoupleReg.MinTemperature, "i22.10");
            this._maxTemperature = this.addRegister<[number]>(jacdac.ThermocoupleReg.MaxTemperature, "i22.10");
            this._temperatureError = this.addRegister<[number]>(jacdac.ThermocoupleReg.TemperatureError, "u22.10");
            this._variant = this.addRegister<[jacdac.ThermocoupleVariant]>(jacdac.ThermocoupleReg.Variant, "u8");            
        }
    

        /**
        * The temperature.
        */
        //% callInDebugger
        //% group="Environment"
        //% block="%thermocouple temperature"
        //% blockId=jacdac_thermocouple_temperature___get
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
        variant(): jacdac.ThermocoupleVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the temperature changes by the given threshold value.
        */
        //% group="Environment"
        //% blockId=jacdac_thermocouple_on_temperature_change
        //% block="on %thermocouple temperature changed by %threshold"
        //% weight=95
        //% threshold.defl=1
        onTemperatureChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

    
    }
    //% fixedInstance whenUsed block="thermocouple 1"
    export const thermocouple1 = new ThermocoupleClient("thermocouple1");
}
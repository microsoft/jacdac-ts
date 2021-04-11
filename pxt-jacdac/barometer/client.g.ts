namespace modules {
    /**
     * A sensor measuring air pressure of outside environment.
     **/
    //% fixedInstances blockGap=8
    export class BarometerClient extends jacdac.SimpleSensorClient {

        private readonly _pressureError : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_BAROMETER, role, "u22.10");

            this._pressureError = this.addRegister<[number]>(jacdac.BarometerReg.PressureError, "u22.10");            
        }
    

        /**
        * The air pressure.
        */
        //% callInDebugger
        //% group="Environment"
        //% block="%barometer pressure"
        //% blockId=jacdac_barometer_pressure___get
        //% weight=100
        pressure(): number {
            return this.reading();
        
        }

        /**
        * The real pressure is between `pressure - pressure_error` and `pressure + pressure_error`.
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=99
        pressureError(): number {
            this.start();            
            const values = this._pressureError.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the pressure changes by the given threshold value.
        */
        //% group="Environment"
        //% blockId=jacdac_barometer_on_pressure_change
        //% block="on %barometer pressure changed by %threshold"
        //% weight=98
        //% threshold.defl=1
        onPressureChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

    
    }
    //% fixedInstance whenUsed block="barometer 1"
    export const barometer1 = new BarometerClient("barometer1");
}
namespace modules {
    /**
     * A 3-axis gyroscope.
     **/
    //% fixedInstances blockGap=8
    export class GyroscopeClient extends jacdac.SensorClient<[number,number,number]> {

        private readonly _rotationRatesError : jacdac.RegisterClient<[number]>;
        private readonly _maxRate : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_GYROSCOPE, role, "i12.20 i12.20 i12.20");

            this._rotationRatesError = this.addRegister<[number]>(jacdac.GyroscopeReg.RotationRatesError, "i12.20");
            this._maxRate = this.addRegister<[number]>(jacdac.GyroscopeReg.MaxRate, "i12.20");            
        }
    

        /**
        * Indicates the current forces acting on accelerometer.
        */
        //% callInDebugger
        //% group="Movement"
        //% block="%gyroscope x"
        //% blockId=jacdac_gyroscope_rotation_rates_x_get
        //% weight=100
        x(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Indicates the current forces acting on accelerometer.
        */
        //% callInDebugger
        //% group="Movement"
        //% block="%gyroscope y"
        //% blockId=jacdac_gyroscope_rotation_rates_y_get
        //% weight=99
        y(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[1];
        }

        /**
        * Indicates the current forces acting on accelerometer.
        */
        //% callInDebugger
        //% group="Movement"
        //% block="%gyroscope z"
        //% blockId=jacdac_gyroscope_rotation_rates_z_get
        //% weight=98
        z(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[2];
        }

        /**
        * Error on the reading value.
        */
        //% callInDebugger
        //% group="Movement"
        //% weight=97
        rotationRatesError(): number {
            this.start();            
            const values = this._rotationRatesError.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Configures the range of range of rotation rates.
        */
        //% callInDebugger
        //% group="Movement"
        //% weight=96
        maxRate(): number {
            this.start();            
            const values = this._maxRate.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Configures the range of range of rotation rates.
        */
        //% group="Movement"
        //% weight=95
        setMaxRate(value: number) {
            this.start();
            const values = this._maxRate.values as any[];
            values[0] = value;
            this._maxRate.values = values as [number];
        }

    
    }
    //% fixedInstance whenUsed
    export const gyroscope = new GyroscopeClient("gyroscope");
}
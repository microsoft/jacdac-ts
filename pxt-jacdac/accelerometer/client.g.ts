namespace modules {
    /**
     * A 3-axis accelerometer.
     **/
    //% fixedInstances blockGap=8
    export class AccelerometerClient extends jacdac.SensorClient<[number,number,number]> {

        private readonly _forcesError : jacdac.RegisterClient<[number]>;
        private readonly _maxForce : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_ACCELEROMETER, role, "i12.20 i12.20 i12.20");

            this._forcesError = this.addRegister<[number]>(jacdac.AccelerometerReg.ForcesError, "i12.20");
            this._maxForce = this.addRegister<[number]>(jacdac.AccelerometerReg.MaxForce, "i12.20");            
        }
    

        /**
        * Indicates the current forces acting on accelerometer.
        */
        //% callInDebugger
        //% group="Movement"
        //% block="%accelerometer x"
        //% blockId=jacdac_accelerometer_forces_x_get
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
        //% block="%accelerometer y"
        //% blockId=jacdac_accelerometer_forces_y_get
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
        //% block="%accelerometer z"
        //% blockId=jacdac_accelerometer_forces_z_get
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
        forcesError(): number {
            this.start();            
            const values = this._forcesError.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Configures the range forces detected.
        * Read-back after setting to get current value.
        */
        //% callInDebugger
        //% group="Movement"
        //% weight=96
        maxForce(): number {
            this.start();            
            const values = this._maxForce.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Configures the range forces detected.
        * Read-back after setting to get current value.
        */
        //% group="Movement"
        //% weight=95
        setMaxForce(value: number) {
            this.start();
            const values = this._maxForce.values as any[];
            values[0] = value;
            this._maxForce.values = values as [number];
        }

        /**
         * Emitted when accelerometer is tilted in the given direction.
         */
        //% group="Movement"
        //% blockId=jacdac_on_accelerometer_tilt_up
        //% block="on %accelerometer tilt up"
        //% weight=94
        onTiltUp(handler: () => void): void {
            this.registerEvent(jacdac.AccelerometerEvent.TiltUp, handler);
        }
        /**
         * Emitted when accelerometer is tilted in the given direction.
         */
        //% group="Movement"
        //% blockId=jacdac_on_accelerometer_tilt_down
        //% block="on %accelerometer tilt down"
        //% weight=93
        onTiltDown(handler: () => void): void {
            this.registerEvent(jacdac.AccelerometerEvent.TiltDown, handler);
        }
        /**
         * Emitted when accelerometer is tilted in the given direction.
         */
        //% group="Movement"
        //% blockId=jacdac_on_accelerometer_tilt_left
        //% block="on %accelerometer tilt left"
        //% weight=92
        onTiltLeft(handler: () => void): void {
            this.registerEvent(jacdac.AccelerometerEvent.TiltLeft, handler);
        }
        /**
         * Emitted when accelerometer is tilted in the given direction.
         */
        //% group="Movement"
        //% blockId=jacdac_on_accelerometer_tilt_right
        //% block="on %accelerometer tilt right"
        //% weight=91
        onTiltRight(handler: () => void): void {
            this.registerEvent(jacdac.AccelerometerEvent.TiltRight, handler);
        }
        /**
         * Emitted when accelerometer is laying flat in the given direction.
         */
        //% group="Movement"
        //% blockId=jacdac_on_accelerometer_face_up
        //% block="on %accelerometer face up"
        //% weight=90
        onFaceUp(handler: () => void): void {
            this.registerEvent(jacdac.AccelerometerEvent.FaceUp, handler);
        }
        /**
         * Emitted when accelerometer is laying flat in the given direction.
         */
        //% group="Movement"
        //% blockId=jacdac_on_accelerometer_face_down
        //% block="on %accelerometer face down"
        //% weight=89
        onFaceDown(handler: () => void): void {
            this.registerEvent(jacdac.AccelerometerEvent.FaceDown, handler);
        }
        /**
         * Emitted when total force acting on accelerometer is much less than 1g.
         */
        //% group="Movement"
        //% blockId=jacdac_on_accelerometer_freefall
        //% block="on %accelerometer freefall"
        //% weight=88
        onFreefall(handler: () => void): void {
            this.registerEvent(jacdac.AccelerometerEvent.Freefall, handler);
        }
        /**
         * Emitted when forces change violently a few times.
         */
        //% group="Movement"
        //% blockId=jacdac_on_accelerometer_shake
        //% block="on %accelerometer shake"
        //% weight=87
        onShake(handler: () => void): void {
            this.registerEvent(jacdac.AccelerometerEvent.Shake, handler);
        }
        /**
         * Emitted when force in any direction exceeds given threshold.
         */
        //% group="Movement"
        //% blockId=jacdac_on_accelerometer_force_2g
        //% block="on %accelerometer force 2g"
        //% weight=86
        onForce2g(handler: () => void): void {
            this.registerEvent(jacdac.AccelerometerEvent.Force2g, handler);
        }
        /**
         * Emitted when force in any direction exceeds given threshold.
         */
        //% group="Movement"
        //% blockId=jacdac_on_accelerometer_force_3g
        //% block="on %accelerometer force 3g"
        //% weight=85
        onForce3g(handler: () => void): void {
            this.registerEvent(jacdac.AccelerometerEvent.Force3g, handler);
        }
        /**
         * Emitted when force in any direction exceeds given threshold.
         */
        //% group="Movement"
        //% blockId=jacdac_on_accelerometer_force_6g
        //% block="on %accelerometer force 6g"
        //% weight=84
        onForce6g(handler: () => void): void {
            this.registerEvent(jacdac.AccelerometerEvent.Force6g, handler);
        }
        /**
         * Emitted when force in any direction exceeds given threshold.
         */
        //% group="Movement"
        //% blockId=jacdac_on_accelerometer_force_8g
        //% block="on %accelerometer force 8g"
        //% weight=83
        onForce8g(handler: () => void): void {
            this.registerEvent(jacdac.AccelerometerEvent.Force8g, handler);
        }
    
    }
    //% fixedInstance whenUsed block="accelerometer 1"
    export const accelerometer1 = new AccelerometerClient("accelerometer1");
}
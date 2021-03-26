namespace modules {
    /**
     * A sensor, typically PIR, that detects object motion within a certain range
     **/
    //% fixedInstances blockGap=8
    export class MotionClient extends jacdac.SensorClient<[boolean]> {

        private readonly _maxDistance : jacdac.RegisterClient<[number]>;
        private readonly _angle : jacdac.RegisterClient<[number]>;
        private readonly _variant : jacdac.RegisterClient<[jacdac.MotionVariant]>;            

        constructor(role: string) {
            super(jacdac.SRV_MOTION, role, "u8");

            this._maxDistance = this.addRegister<[number]>(jacdac.MotionReg.MaxDistance, "u16.16");
            this._angle = this.addRegister<[number]>(jacdac.MotionReg.Angle, "u16");
            this._variant = this.addRegister<[jacdac.MotionVariant]>(jacdac.MotionReg.Variant, "u8");            
        }
    

        /**
        * Reports is movement is currently detected by the sensor.
        */
        //% callInDebugger
        //% group="Movement"
        //% block="%motion moving"
        //% blockId=jacdac_motion_moving___get
        //% weight=100
        moving(): boolean {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * Maximum distance where objects can be detected.
        */
        //% callInDebugger
        //% group="Movement"
        //% weight=99
        maxDistance(): number {
            this.start();            
            const values = this._maxDistance.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Opening of the field of view
        */
        //% callInDebugger
        //% group="Movement"
        //% weight=98
        angle(): number {
            this.start();            
            const values = this._angle.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Type of physical sensor
        */
        //% callInDebugger
        //% group="Movement"
        //% weight=97
        variant(): jacdac.MotionVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * A movement was detected.
         */
        //% group="Movement"
        //% blockId=jacdac_on_motion_movement
        //% block="on %motion movement"
        //% weight=96
        onMovement(handler: () => void): void {
            this.registerEvent(jacdac.MotionEvent.Movement, handler);
        }
    
    }
    //% fixedInstance whenUsed
    export const motion = new MotionClient("motion");
}
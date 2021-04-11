namespace modules {
    /**
     * Servo is a small motor with arm that can be pointing at a specific direction.
     * 
     * The `min/max_angle/pulse` may be read-only if the servo is permanently affixed to its Jacdac controller.
     **/
    //% fixedInstances blockGap=8
    export class ServoClient extends jacdac.Client {

        private readonly _angle : jacdac.RegisterClient<[number]>;
        private readonly _enabled : jacdac.RegisterClient<[boolean]>;
        private readonly _offset : jacdac.RegisterClient<[number]>;
        private readonly _minAngle : jacdac.RegisterClient<[number]>;
        private readonly _minPulse : jacdac.RegisterClient<[number]>;
        private readonly _maxAngle : jacdac.RegisterClient<[number]>;
        private readonly _maxPulse : jacdac.RegisterClient<[number]>;
        private readonly _stallTorque : jacdac.RegisterClient<[number]>;
        private readonly _responseSpeed : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_SERVO, role);

            this._angle = this.addRegister<[number]>(jacdac.ServoReg.Angle, "i16.16");
            this._enabled = this.addRegister<[boolean]>(jacdac.ServoReg.Enabled, "u8");
            this._offset = this.addRegister<[number]>(jacdac.ServoReg.Offset, "i16.16");
            this._minAngle = this.addRegister<[number]>(jacdac.ServoReg.MinAngle, "i16.16");
            this._minPulse = this.addRegister<[number]>(jacdac.ServoReg.MinPulse, "u16");
            this._maxAngle = this.addRegister<[number]>(jacdac.ServoReg.MaxAngle, "i16.16");
            this._maxPulse = this.addRegister<[number]>(jacdac.ServoReg.MaxPulse, "u16");
            this._stallTorque = this.addRegister<[number]>(jacdac.ServoReg.StallTorque, "u16.16");
            this._responseSpeed = this.addRegister<[number]>(jacdac.ServoReg.ResponseSpeed, "u16.16");            
        }
    

        /**
        * Specifies the angle of the arm.
        */
        //% callInDebugger
        //% group="Servo"
        //% block="%servo angle"
        //% blockId=jacdac_servo_angle___get
        //% weight=100
        angle(): number {
            this.start();            
            const values = this._angle.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Specifies the angle of the arm.
        */
        //% group="Servo"
        //% blockId=jacdac_servo_angle___set
        //% block="set %servo angle to %value"
        //% weight=99
        //% value.min=-90
        //% value.max=90
        setAngle(value: number) {
            this.start();
            const values = this._angle.values as any[];
            values[0] = value;
            this._angle.values = values as [number];
        }

        /**
        * Turn the power to the servo on/off.
        */
        //% callInDebugger
        //% group="Servo"
        //% block="%servo enabled"
        //% blockId=jacdac_servo_enabled___get
        //% weight=98
        enabled(): boolean {
            this.start();            
            const values = this._enabled.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * Turn the power to the servo on/off.
        */
        //% group="Servo"
        //% blockId=jacdac_servo_enabled___set
        //% block="set %servo %value=toggleOnOff"
        //% weight=97
        setEnabled(value: boolean) {
            this.start();
            const values = this._enabled.values as any[];
            values[0] = value ? 1 : 0;
            this._enabled.values = values as [boolean];
        }

        /**
        * Correction applied to the angle to account for the servo arm drift.
        */
        //% callInDebugger
        //% group="Servo"
        //% weight=96
        offset(): number {
            this.start();            
            const values = this._offset.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Correction applied to the angle to account for the servo arm drift.
        */
        //% group="Servo"
        //% weight=95
        setOffset(value: number) {
            this.start();
            const values = this._offset.values as any[];
            values[0] = value;
            this._offset.values = values as [number];
        }

        /**
        * Lowest angle that can be set.
        */
        //% callInDebugger
        //% group="Servo"
        //% weight=94
        minAngle(): number {
            this.start();            
            const values = this._minAngle.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Lowest angle that can be set.
        */
        //% group="Servo"
        //% weight=93
        //% value.defl=-90
        setMinAngle(value: number) {
            this.start();
            const values = this._minAngle.values as any[];
            values[0] = value;
            this._minAngle.values = values as [number];
        }

        /**
        * The length of pulse corresponding to lowest angle.
        */
        //% callInDebugger
        //% group="Servo"
        //% weight=92
        minPulse(): number {
            this.start();            
            const values = this._minPulse.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The length of pulse corresponding to lowest angle.
        */
        //% group="Servo"
        //% weight=91
        //% value.defl=500
        setMinPulse(value: number) {
            this.start();
            const values = this._minPulse.values as any[];
            values[0] = value;
            this._minPulse.values = values as [number];
        }

        /**
        * Highest angle that can be set.
        */
        //% callInDebugger
        //% group="Servo"
        //% weight=90
        maxAngle(): number {
            this.start();            
            const values = this._maxAngle.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Highest angle that can be set.
        */
        //% group="Servo"
        //% weight=89
        //% value.defl=90
        setMaxAngle(value: number) {
            this.start();
            const values = this._maxAngle.values as any[];
            values[0] = value;
            this._maxAngle.values = values as [number];
        }

        /**
        * The length of pulse corresponding to highest angle.
        */
        //% callInDebugger
        //% group="Servo"
        //% weight=88
        maxPulse(): number {
            this.start();            
            const values = this._maxPulse.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The length of pulse corresponding to highest angle.
        */
        //% group="Servo"
        //% weight=87
        //% value.defl=2500
        setMaxPulse(value: number) {
            this.start();
            const values = this._maxPulse.values as any[];
            values[0] = value;
            this._maxPulse.values = values as [number];
        }

        /**
        * The servo motor will stop rotating when it is trying to move a ``stall_torque`` weight at a radial distance of ``1.0`` cm.
        */
        //% callInDebugger
        //% group="Servo"
        //% weight=86
        stallTorque(): number {
            this.start();            
            const values = this._stallTorque.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Time to move 60°.
        */
        //% callInDebugger
        //% group="Servo"
        //% weight=85
        responseSpeed(): number {
            this.start();            
            const values = this._responseSpeed.pauseUntilValues() as any[];
            return values[0];
        }

    
    }
    //% fixedInstance whenUsed block="servo 1"
    export const servo1 = new ServoClient("servo1");
}
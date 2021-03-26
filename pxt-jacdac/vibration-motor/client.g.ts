namespace modules {
    /**
     * A vibration motor.
     **/
    //% fixedInstances blockGap=8
    export class VibrationMotorClient extends jacdac.Client {

        private readonly _enabled : jacdac.RegisterClient<[boolean]>;            

        constructor(role: string) {
            super(jacdac.SRV_VIBRATION_MOTOR, role);

            this._enabled = this.addRegister<[boolean]>(jacdac.VibrationMotorReg.Enabled, "u8");            
        }
    

        /**
        * Determines if the vibration motor responds to vibrate commands.
        */
        //% callInDebugger
        //% group="Vibration motor"
        //% block="%vibration enabled"
        //% blockId=jacdac_vibration_enabled___get
        //% weight=100
        enabled(): boolean {
            this.start();            
            const values = this._enabled.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * Determines if the vibration motor responds to vibrate commands.
        */
        //% group="Vibration motor"
        //% blockId=jacdac_vibration_enabled___set
        //% block="set %vibration %value=toggleOnOff"
        //% weight=99
        setEnabled(value: boolean) {
            this.start();
            const values = this._enabled.values as any[];
            values[0] = value ? 1 : 0;
            this._enabled.values = values as [boolean];
        }


        /**
        * Starts a sequence of vibration and pauses. To stop any existing vibration, send an empty payload.
        */
        //% group="Vibration motor"
        //% blockId=jacdac_vibration_vibrate_cmd
        //% block="%vibration vibrate"
        //% weight=98
        vibrate(duration: ([number, number])[], speed: undefined): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.VibrationMotorCmd.Vibrate, "r: u8 u0.8", [duration, speed]))
        }
    
    }
    //% fixedInstance whenUsed
    export const vibrationMotor = new VibrationMotorClient("vibration Motor");
}
namespace modules {
    //% fixedInstances
    export class MotorClient extends jacdac.Client {
        constructor(role: string) {
            super(jacdac.SRV_MOTOR, role);
        }

        /**
         * Set the throttle on a DC motor
         * @param speed the throttle of the motor from -100% to 100%
         */
        //% group="Motors"
        //% weight=99
        //% blockId=jdmotorrun block="run %motor at $speed=speedPicker \\%"
        //% servo.fieldEditor="gridpicker"
        //% servo.fieldOptions.width=220
        //% servo.fieldOptions.columns=2
        run(speed: number): void {
            speed = Math.clamp(-100, 100, speed)
            if (speed == 0)
                this.setReg(jacdac.MotorReg.Enabled, "u8", [0])
            else {
                this.setReg(jacdac.MotorReg.Duty, "u1.15", [Math.clamp(-0x7fff, 0x7fff, (speed * 327.67) | 0)])
                this.setReg(jacdac.MotorReg.Enabled, "u8", [1])
            }
        }
    }

    //% fixedInstance whenUsed
    export const motor = new MotorClient("motor");
}
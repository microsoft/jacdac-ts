namespace modules {
    /**
     * A two axis directional joystick
     **/
    //% fixedInstances blockGap=8
    export class JoystickClient extends jacdac.SensorClient<[number,number]> {

        private readonly _variant : jacdac.RegisterClient<[jacdac.JoystickVariant]>;
        private readonly _digital : jacdac.RegisterClient<[boolean]>;            

        constructor(role: string) {
            super(jacdac.SRV_JOYSTICK, role, "i1.15 i1.15");

            this._variant = this.addRegister<[jacdac.JoystickVariant]>(jacdac.JoystickReg.Variant, "u8");
            this._digital = this.addRegister<[boolean]>(jacdac.JoystickReg.Digital, "u8");            
        }
    

        /**
        * The direction of the joystick measure in two direction.
        * If joystick is digital, then each direction will read as either `-0x8000`, `0x0`, or `0x7fff`.
        */
        //% callInDebugger
        //% group="Button"
        //% block="%joystick x"
        //% blockId=jacdac_joystick_direction_x_get
        //% weight=100
        x(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[0] * 100;
        }

        /**
        * The direction of the joystick measure in two direction.
        * If joystick is digital, then each direction will read as either `-0x8000`, `0x0`, or `0x7fff`.
        */
        //% callInDebugger
        //% group="Button"
        //% block="%joystick y"
        //% blockId=jacdac_joystick_direction_y_get
        //% weight=99
        y(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[1] * 100;
        }

        /**
        * The type of physical joystick.
        */
        //% callInDebugger
        //% group="Button"
        //% weight=98
        variant(): jacdac.JoystickVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Indicates if the joystick is digital, typically made of switches.
        */
        //% callInDebugger
        //% group="Button"
        //% weight=97
        digital(): boolean {
            this.start();            
            const values = this._digital.pauseUntilValues() as any[];
            return !!values[0];
        }

    
    }
    //% fixedInstance whenUsed
    export const joystick = new JoystickClient("joystick");
}
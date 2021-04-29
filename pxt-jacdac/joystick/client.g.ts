namespace modules {
    /**
     * A two axis directional joystick
     **/
    //% fixedInstances blockGap=8
    export class JoystickClient extends jacdac.SensorClient {

        private readonly _variant : jacdac.RegisterClient<[jacdac.JoystickVariant]>;
        private readonly _buttonsAvailable : jacdac.RegisterClient<[jacdac.JoystickButtons]>;            

        constructor(role: string) {
            super(jacdac.SRV_JOYSTICK, role, "u32 i1.15 i1.15");

            this._variant = this.addRegister<[jacdac.JoystickVariant]>(jacdac.JoystickReg.Variant, "u8");
            this._buttonsAvailable = this.addRegister<[jacdac.JoystickButtons]>(jacdac.JoystickReg.ButtonsAvailable, "u32");            
        }
    

        /**
        * If the joystick is analog, the directional buttons should be "simulated", based on joystick position
        * (`Left` is `{ x = -1, y = 0 }`, `Up` is `{ x = 0, y = -1}`).
        * If the joystick is digital, then each direction will read as either `-1`, `0`, or `1` (in fixed representation).
        * The primary button on the joystick is `A`.
        */
        //% callInDebugger
        //% group="Button"
        //% block="%joystick buttons"
        //% blockId=jacdac_joystick_direction_buttons_get
        //% weight=100
        buttons(): jacdac.JoystickButtons {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * If the joystick is analog, the directional buttons should be "simulated", based on joystick position
        * (`Left` is `{ x = -1, y = 0 }`, `Up` is `{ x = 0, y = -1}`).
        * If the joystick is digital, then each direction will read as either `-1`, `0`, or `1` (in fixed representation).
        * The primary button on the joystick is `A`.
        */
        //% callInDebugger
        //% group="Button"
        //% block="%joystick x"
        //% blockId=jacdac_joystick_direction_x_get
        //% weight=99
        x(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[1] * 100;
        }

        /**
        * If the joystick is analog, the directional buttons should be "simulated", based on joystick position
        * (`Left` is `{ x = -1, y = 0 }`, `Up` is `{ x = 0, y = -1}`).
        * If the joystick is digital, then each direction will read as either `-1`, `0`, or `1` (in fixed representation).
        * The primary button on the joystick is `A`.
        */
        //% callInDebugger
        //% group="Button"
        //% block="%joystick y"
        //% blockId=jacdac_joystick_direction_y_get
        //% weight=98
        y(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[2] * 100;
        }

        /**
        * The type of physical joystick.
        */
        //% callInDebugger
        //% group="Button"
        //% weight=97
        variant(): jacdac.JoystickVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Indicates a bitmask of the buttons that are mounted on the joystick.
        * If the `Left`/`Up`/`Right`/`Down` buttons are marked as available here, the joystick is digital.
        * Even when marked as not available, they will still be simulated based on the analog joystick.
        */
        //% callInDebugger
        //% group="Button"
        //% weight=96
        buttonsAvailable(): jacdac.JoystickButtons {
            this.start();            
            const values = this._buttonsAvailable.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Emitted whenever the state of buttons changes.
         */
        //% group="Button"
        //% blockId=jacdac_on_joystick_buttons_changed
        //% block="on %joystick buttons changed"
        //% weight=95
        onButtonsChanged(handler: () => void): void {
            this.registerEvent(jacdac.JoystickEvent.ButtonsChanged, handler);
        }
    
    }
    //% fixedInstance whenUsed block="joystick 1"
    export const joystick1 = new JoystickClient("joystick1");
}
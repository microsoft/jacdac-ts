namespace modules {
    /**
     * Controls a HID mouse. 
     * 
     * This service cannot be simulated.
     **/
    //% fixedInstances blockGap=8
    export class HidMouseClient extends jacdac.Client {
            

        constructor(role: string) {
            super(jacdac.SRV_HID_MOUSE, role);
            
        }
    


        /**
        * Sets the up/down state of one or more buttons.
        * A ``Click`` is the same as ``Down`` followed by ``Up`` after 100ms.
        * A ``DoubleClick`` is two clicks with ``150ms`` gap between them (that is, ``100ms`` first click, ``150ms`` gap, ``100ms`` second click).
        */
        //% group="HID Mouse"
        //% blockId=jacdac_hidmouse_set_button_cmd
        //% block="%hidmouse set button"
        //% weight=100
        setButton(buttons: jacdac.HidMouseButton, event: jacdac.HidMouseButtonEvent): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.HidMouseCmd.SetButton, "u16 u8", [buttons, event]))
        }

        /**
        * Moves the mouse by the distance specified.
        * If the time is positive, it specifies how long to make the move.
        */
        //% group="HID Mouse"
        //% blockId=jacdac_hidmouse_move_cmd
        //% block="%hidmouse move"
        //% weight=99
        move(dx: number, dy: number, time: number): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.HidMouseCmd.Move, "i16 i16 u16", [dx, dy, time]))
        }

        /**
        * Turns the wheel up or down. Positive if scrolling up.
        * If the time is positive, it specifies how long to make the move.
        */
        //% group="HID Mouse"
        //% blockId=jacdac_hidmouse_wheel_cmd
        //% block="%hidmouse wheel"
        //% weight=98
        wheel(dy: number, time: number): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.HidMouseCmd.Wheel, "i16 u16", [dy, time]))
        }
    
    }
    //% fixedInstance whenUsed block="hid mouse 1"
    export const hidMouse1 = new HidMouseClient("hid Mouse1");
}
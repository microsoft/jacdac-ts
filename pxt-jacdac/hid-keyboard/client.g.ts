namespace modules {
    /**
     * Control a HID keyboard. 
     * 
     * This service cannot be simulated.
     * 
     * The codes for the key (selectors) is defined in the [HID Keyboard
     * specification](https://usb.org/sites/default/files/hut1_21.pdf), chapter 10 Keyboard/Keypad Page, page 81.
     * Modifiers are in page 87.
     * 
     * The device keeps tracks of the key state and is able to clear it all with the clear command.
     **/
    //% fixedInstances blockGap=8
    export class HidKeyboardClient extends jacdac.Client {
            

        constructor(role: string) {
            super(jacdac.SRV_HID_KEYBOARD, role);
            
        }
    


        /**
        * Presses a key or a sequence of keys down.
        */
        //% group="HID Keyboard"
        //% blockId=jacdac_hidkeyboard_key_cmd
        //% block="%hidkeyboard key"
        //% weight=100
        key(selector: ([number, jacdac.HidKeyboardModifiers, jacdac.HidKeyboardAction])[], modifiers: undefined, action: undefined): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.HidKeyboardCmd.Key, "r: u16 u8 u8", [selector, modifiers, action]))
        }

        /**
        * Clears all pressed keys.
        */
        //% group="HID Keyboard"
        //% blockId=jacdac_hidkeyboard_clear_cmd
        //% block="%hidkeyboard clear"
        //% weight=99
        clear(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.HidKeyboardCmd.Clear))
        }
    
    }
    //% fixedInstance whenUsed block="hid keyboard 1"
    export const hidKeyboard1 = new HidKeyboardClient("hid Keyboard1");
}
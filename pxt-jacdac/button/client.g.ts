namespace modules {
    /**
     * A push-button, which returns to inactive position when not operated anymore.
     **/
    //% fixedInstances blockGap=8
    export class ButtonClient extends jacdac.SensorClient<[boolean]> {
            

        constructor(role: string) {
            super(jacdac.SRV_BUTTON, role, "u8");
            
        }
    

        /**
        * Indicates whether the button is currently active (pressed).
        */
        //% callInDebugger
        //% group="Button"
        //% block="%button pressed"
        //% blockId=jacdac_button_pressed___get
        //% weight=100
        pressed(): boolean {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
         * Emitted when button goes from inactive (`pressed == 0`) to active.
         */
        //% group="Button"
        //% blockId=jacdac_on_button_down
        //% block="on %button down"
        //% weight=99
        onDown(handler: () => void): void {
            this.registerEvent(jacdac.ButtonEvent.Down, handler);
        }
        /**
         * Emitted when button goes from active (`pressed == 1`) to inactive. The 'time' parameter 
        * records the amount of time between the down and up events.
         */
        //% group="Button"
        //% blockId=jacdac_on_button_up
        //% block="on %button up"
        //% weight=98
        onUp(handler: () => void): void {
            this.registerEvent(jacdac.ButtonEvent.Up, handler);
        }
        /**
         * Emitted when the press time is greater than 500ms, and then at least every 500ms 
        * as long as the button remains pressed. The 'time' parameter records the the amount of time
        * that the button has been held (since the down event).
         */
        //% group="Button"
        //% blockId=jacdac_on_button_hold
        //% block="on %button hold"
        //% weight=97
        onHold(handler: () => void): void {
            this.registerEvent(jacdac.ButtonEvent.Hold, handler);
        }
    
    }
    //% fixedInstance whenUsed block="button 1"
    export const button1 = new ButtonClient("button1");
}
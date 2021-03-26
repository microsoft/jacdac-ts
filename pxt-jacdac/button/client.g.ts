namespace modules {
    /**
     * A push-button, which returns to inactive position when not operated anymore.
     **/
    //% fixedInstances blockGap=8
    export class ButtonClient extends jacdac.SensorClient<[boolean]> {

        private readonly _clickHoldTime : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_BUTTON, role, "u8");

            this._clickHoldTime = this.addRegister<[number]>(jacdac.ButtonReg.ClickHoldTime, "u32");            
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
        * Threshold for `click` and `hold` events (see event descriptions below).
        */
        //% callInDebugger
        //% group="Button"
        //% weight=99
        clickHoldTime(): number {
            this.start();            
            const values = this._clickHoldTime.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Threshold for `click` and `hold` events (see event descriptions below).
        */
        //% group="Button"
        //% weight=98
        //% value.min=500
        //% value.defl=1000
        setClickHoldTime(value: number) {
            this.start();
            const values = this._clickHoldTime.values as any[];
            values[0] = value;
            this._clickHoldTime.values = values as [number];
        }

        /**
         * Emitted when button goes from inactive (`pressed == 0`) to active.
         */
        //% group="Button"
        //% blockId=jacdac_on_button_down
        //% block="on %button down"
        //% weight=97
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
        //% weight=96
        onUp(handler: () => void): void {
            this.registerEvent(jacdac.ButtonEvent.Up, handler);
        }
        /**
         * Emitted together with `up` when the press time less than or equal to `click_hold_time`.
         */
        //% group="Button"
        //% blockId=jacdac_on_button_click
        //% block="on %button click"
        //% weight=95
        onClick(handler: () => void): void {
            this.registerEvent(jacdac.ButtonEvent.Click, handler);
        }
        /**
         * Emitted when the press times is greater than `click_hold_time`. Hold events are followed by a separate up event.
         */
        //% group="Button"
        //% blockId=jacdac_on_button_hold
        //% block="on %button hold"
        //% weight=94
        onHold(handler: () => void): void {
            this.registerEvent(jacdac.ButtonEvent.Hold, handler);
        }
    
    }
    //% fixedInstance whenUsed
    export const button = new ButtonClient("button");
}
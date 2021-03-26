namespace modules {
    /**
     * A capacitive touch sensor with multiple inputs.
     **/
    //% fixedInstances blockGap=8
    export class MultitouchClient extends jacdac.SensorClient<[number[]]> {
            

        constructor(role: string) {
            super(jacdac.SRV_MULTITOUCH, role, "r: i32");
            
        }
    

        /**
        * Capacitance of channels. The capacitance is continuously calibrated, and a value of `0` indicates
        * no touch, wheres a value of around `100` or more indicates touch.
        * It's best to ignore this (unless debugging), and use events.
        */
        //% callInDebugger
        //% group="Button"
        //% block="%multitouch capacitance"
        //% blockId=jacdac_multitouch_capacity_capacitance_get
        //% weight=100
        capacitance(): number[] {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Emitted when an input is touched.
         */
        //% group="Button"
        //% blockId=jacdac_on_multitouch_touch
        //% block="on %multitouch touch"
        //% weight=99
        onTouch(handler: () => void): void {
            this.registerEvent(jacdac.MultitouchEvent.Touch, handler);
        }
        /**
         * Emitted when an input is no longer touched.
         */
        //% group="Button"
        //% blockId=jacdac_on_multitouch_release
        //% block="on %multitouch release"
        //% weight=98
        onRelease(handler: () => void): void {
            this.registerEvent(jacdac.MultitouchEvent.Release, handler);
        }
        /**
         * Emitted when an input is briefly touched. TODO Not implemented.
         */
        //% group="Button"
        //% blockId=jacdac_on_multitouch_tap
        //% block="on %multitouch tap"
        //% weight=97
        onTap(handler: () => void): void {
            this.registerEvent(jacdac.MultitouchEvent.Tap, handler);
        }
        /**
         * Emitted when an input is touched for longer than 500ms. TODO Not implemented.
         */
        //% group="Button"
        //% blockId=jacdac_on_multitouch_long_press
        //% block="on %multitouch long press"
        //% weight=96
        onLongPress(handler: () => void): void {
            this.registerEvent(jacdac.MultitouchEvent.LongPress, handler);
        }
        /**
         * Emitted when input channels are successively touched in order of increasing channel numbers.
         */
        //% group="Button"
        //% blockId=jacdac_on_multitouch_swipe_pos
        //% block="on %multitouch swipe pos"
        //% weight=95
        onSwipePos(handler: () => void): void {
            this.registerEvent(jacdac.MultitouchEvent.SwipePos, handler);
        }
        /**
         * Emitted when input channels are successively touched in order of decreasing channel numbers.
         */
        //% group="Button"
        //% blockId=jacdac_on_multitouch_swipe_neg
        //% block="on %multitouch swipe neg"
        //% weight=94
        onSwipeNeg(handler: () => void): void {
            this.registerEvent(jacdac.MultitouchEvent.SwipeNeg, handler);
        }
    
    }
    //% fixedInstance whenUsed
    export const multitouch = new MultitouchClient("multitouch");
}
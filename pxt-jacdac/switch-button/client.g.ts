namespace modules {
    /**
     * A switch, which keeps its position.
     **/
    //% fixedInstances blockGap=8
    export class SwitchButtonClient extends jacdac.SensorClient<[boolean]> {
            

            constructor(role: string) {
            super(jacdac.SRV_SWITCH_BUTTON, role, "u8");
            
        }
    

        /**
        * Indicates whether the switch is currently active (on).
        */
        //% blockId=jacdac_switch_active___get
        //% group="Button"
        //% block="%switch active" callInDebugger
        active(): boolean {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return !!values[0];
        } 

        /**
         * Emitted when switch goes from ``off`` to ``on``.
         */
        //% blockId=jacdac_on_switch_on
        //% block="on" blockSetVariable=myModule
        //% group="Button"
        onOn(handler: () => void) {
            this.registerEvent(jacdac.SwitchButtonEvent.On, handler);
        }
        /**
         * Emitted when switch goes from ``on`` to ``off``.
         */
        //% blockId=jacdac_on_switch_off
        //% block="off" blockSetVariable=myModule
        //% group="Button"
        onOff(handler: () => void) {
            this.registerEvent(jacdac.SwitchButtonEvent.Off, handler);
        }
    }
    //% fixedInstance whenUsed
    export const switchButton = new SwitchButtonClient("switch Button");
}
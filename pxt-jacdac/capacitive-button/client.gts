namespace modules {
    /**
     * A configuration service for a capacitive push-button.
     **/
    //% fixedInstances blockGap=8
    export class CapacitiveButtonClient extends jacdac.Client {

        private readonly _threshold : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_CAPACITIVE_BUTTON, role);

            this._threshold = this.addRegister<[number]>(jacdac.CapacitiveButtonReg.Threshold, "u0.16");            
        }
    

        /**
        * Indicates the threshold for ``up`` events.
        */
        //% callInDebugger
        //% group="Button"
        //% weight=100
        threshold(): number {
            this.start();            
            const values = this._threshold.pauseUntilValues() as any[];
            return values[0] * 100;
        }

        /**
        * Indicates the threshold for ``up`` events.
        */
        //% group="Button"
        //% weight=99
        //% value.min=0
        //% value.max=100
        //% value.defl=100
        setThreshold(value: number) {
            this.start();
            const values = this._threshold.values as any[];
            values[0] = value / 100;
            this._threshold.values = values as [number];
        }


        /**
        * Request to calibrate the capactive. When calibration is requested, the device expects that no object is touching the button. 
        * The report indicates the calibration is done.
        */
        //% group="Button"
        //% blockId=jacdac_capacitivebutton_calibrate_cmd
        //% block="%capacitivebutton calibrate"
        //% weight=98
        calibrate(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.CapacitiveButtonCmd.Calibrate))
        }
    
    }
    //% fixedInstance whenUsed block="capacitive button 1"
    export const capacitiveButton1 = new CapacitiveButtonClient("capacitive Button1");
}
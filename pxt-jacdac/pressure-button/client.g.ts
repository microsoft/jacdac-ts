namespace modules {
    /**
     * A pressure sensitive push-button.
     **/
    //% fixedInstances blockGap=8
    export class PressureButtonClient extends jacdac.Client {

        private readonly _threshold : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_PRESSURE_BUTTON, role);

            this._threshold = this.addRegister<[number]>(jacdac.PressureButtonReg.Threshold, "u0.16");            
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

    
    }
    //% fixedInstance whenUsed block="pressure button 1"
    export const pressureButton1 = new PressureButtonClient("pressure Button1");
}
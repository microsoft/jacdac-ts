namespace modules {
    /**
     * A weight measuring sensor.
     **/
    //% fixedInstances blockGap=8
    export class WeightScaleClient extends jacdac.SimpleSensorClient {

        private readonly _weightError : jacdac.RegisterClient<[number]>;
        private readonly _zeroOffset : jacdac.RegisterClient<[number]>;
        private readonly _gain : jacdac.RegisterClient<[number]>;
        private readonly _maxWeight : jacdac.RegisterClient<[number]>;
        private readonly _minWeight : jacdac.RegisterClient<[number]>;
        private readonly _weightResolution : jacdac.RegisterClient<[number]>;
        private readonly _variant : jacdac.RegisterClient<[jacdac.WeightScaleVariant]>;            

        constructor(role: string) {
            super(jacdac.SRV_WEIGHT_SCALE, role, "u16.16");

            this._weightError = this.addRegister<[number]>(jacdac.WeightScaleReg.WeightError, "u16.16");
            this._zeroOffset = this.addRegister<[number]>(jacdac.WeightScaleReg.ZeroOffset, "u16.16");
            this._gain = this.addRegister<[number]>(jacdac.WeightScaleReg.Gain, "u16.16");
            this._maxWeight = this.addRegister<[number]>(jacdac.WeightScaleReg.MaxWeight, "u16.16");
            this._minWeight = this.addRegister<[number]>(jacdac.WeightScaleReg.MinWeight, "u16.16");
            this._weightResolution = this.addRegister<[number]>(jacdac.WeightScaleReg.WeightResolution, "u16.16");
            this._variant = this.addRegister<[jacdac.WeightScaleVariant]>(jacdac.WeightScaleReg.Variant, "u8");            
        }
    

        /**
        * The reported weight.
        */
        //% callInDebugger
        //% group="Weight Scale"
        //% block="%weightscale weight"
        //% blockId=jacdac_weightscale_weight___get
        //% weight=100
        weight(): number {
            return this.reading();
        
        }

        /**
        * The estimate error on the reported reading.
        */
        //% callInDebugger
        //% group="Weight Scale"
        //% weight=99
        weightError(): number {
            this.start();            
            const values = this._weightError.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Calibrated zero offset error on the scale, i.e. the measured weight when nothing is on the scale.
        * You do not need to subtract that from the reading, it has already been done.
        */
        //% callInDebugger
        //% group="Weight Scale"
        //% weight=98
        zeroOffset(): number {
            this.start();            
            const values = this._zeroOffset.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Calibrated zero offset error on the scale, i.e. the measured weight when nothing is on the scale.
        * You do not need to subtract that from the reading, it has already been done.
        */
        //% group="Weight Scale"
        //% weight=97
        setZeroOffset(value: number) {
            this.start();
            const values = this._zeroOffset.values as any[];
            values[0] = value;
            this._zeroOffset.values = values as [number];
        }

        /**
        * Calibrated gain on the weight scale error.
        */
        //% callInDebugger
        //% group="Weight Scale"
        //% weight=96
        gain(): number {
            this.start();            
            const values = this._gain.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Calibrated gain on the weight scale error.
        */
        //% group="Weight Scale"
        //% weight=95
        setGain(value: number) {
            this.start();
            const values = this._gain.values as any[];
            values[0] = value;
            this._gain.values = values as [number];
        }

        /**
        * Maximum supported weight on the scale.
        */
        //% callInDebugger
        //% group="Weight Scale"
        //% weight=94
        maxWeight(): number {
            this.start();            
            const values = this._maxWeight.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Minimum recommend weight on the scale.
        */
        //% callInDebugger
        //% group="Weight Scale"
        //% weight=93
        minWeight(): number {
            this.start();            
            const values = this._minWeight.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Smallest, yet distinguishable change in reading.
        */
        //% callInDebugger
        //% group="Weight Scale"
        //% weight=92
        weightResolution(): number {
            this.start();            
            const values = this._weightResolution.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The type of physical scale
        */
        //% callInDebugger
        //% group="Weight Scale"
        //% weight=91
        variant(): jacdac.WeightScaleVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the weight changes by the given threshold value.
        */
        //% group="Weight Scale"
        //% blockId=jacdac_weightscale_on_weight_change
        //% block="on %weightscale weight changed by %threshold"
        //% weight=90
        //% threshold.defl=1
        onWeightChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }


        /**
        * Call this command when there is nothing on the scale. If supported, the module should save the calibration data.
        */
        //% group="Weight Scale"
        //% blockId=jacdac_weightscale_calibrate_zero_offset_cmd
        //% block="%weightscale calibrate zero offset"
        //% weight=89
        calibrateZeroOffset(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.WeightScaleCmd.CalibrateZeroOffset))
        }

        /**
        * Call this command with the weight of the thing on the scale.
        */
        //% group="Weight Scale"
        //% blockId=jacdac_weightscale_calibrate_gain_cmd
        //% block="%weightscale calibrate gain"
        //% weight=88
        calibrateGain(weight: number): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.WeightScaleCmd.CalibrateGain, "u22.10", [weight]))
        }
    
    }
    //% fixedInstance whenUsed
    export const weightScale = new WeightScaleClient("weight Scale");
}
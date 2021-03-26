namespace modules {
    /**
     * A single-channel microphone.
     **/
    //% fixedInstances blockGap=8
    export class MicrophoneClient extends jacdac.Client {

        private readonly _samplingPeriod : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_MICROPHONE, role);

            this._samplingPeriod = this.addRegister<[number]>(jacdac.MicrophoneReg.SamplingPeriod, "u32");            
        }
    

        /**
        * Get or set microphone sampling period.
        * Sampling rate is `1_000_000 / sampling_period Hz`.
        */
        //% callInDebugger
        //% group="Sound"
        //% weight=100
        samplingPeriod(): number {
            this.start();            
            const values = this._samplingPeriod.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Get or set microphone sampling period.
        * Sampling rate is `1_000_000 / sampling_period Hz`.
        */
        //% group="Sound"
        //% weight=99
        setSamplingPeriod(value: number) {
            this.start();
            const values = this._samplingPeriod.values as any[];
            values[0] = value;
            this._samplingPeriod.values = values as [number];
        }

    
    }
    //% fixedInstance whenUsed
    export const microphone = new MicrophoneClient("microphone");
}
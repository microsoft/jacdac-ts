namespace modules {
    /**
     * A microphone that analyzes the sound specturm
     **/
    //% fixedInstances blockGap=8
    export class SoundSpectrumClient extends jacdac.SensorClient<[Buffer]> {

        private readonly _enabled : jacdac.RegisterClient<[boolean]>;
        private readonly _fftPow2Size : jacdac.RegisterClient<[number]>;
        private readonly _minDecibels : jacdac.RegisterClient<[number]>;
        private readonly _maxDecibels : jacdac.RegisterClient<[number]>;
        private readonly _smoothingTimeConstant : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_SOUND_SPECTRUM, role, "b");

            this._enabled = this.addRegister<[boolean]>(jacdac.SoundSpectrumReg.Enabled, "u8");
            this._fftPow2Size = this.addRegister<[number]>(jacdac.SoundSpectrumReg.FftPow2Size, "u8");
            this._minDecibels = this.addRegister<[number]>(jacdac.SoundSpectrumReg.MinDecibels, "i16");
            this._maxDecibels = this.addRegister<[number]>(jacdac.SoundSpectrumReg.MaxDecibels, "i16");
            this._smoothingTimeConstant = this.addRegister<[number]>(jacdac.SoundSpectrumReg.SmoothingTimeConstant, "u0.8");            
        }
    

        /**
        * The computed frequency data.
        */
        //% callInDebugger
        //% group="Sound"
        //% block="%soundspectrum frequency bins"
        //% blockId=jacdac_soundspectrum_frequency_bins___get
        //% weight=100
        frequencyBins(): Buffer {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Turns on/off the micropohone.
        */
        //% callInDebugger
        //% group="Sound"
        //% block="%soundspectrum enabled"
        //% blockId=jacdac_soundspectrum_enabled___get
        //% weight=99
        enabled(): boolean {
            this.start();            
            const values = this._enabled.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * Turns on/off the micropohone.
        */
        //% group="Sound"
        //% blockId=jacdac_soundspectrum_enabled___set
        //% block="set %soundspectrum %value=toggleOnOff"
        //% weight=98
        setEnabled(value: boolean) {
            this.start();
            const values = this._enabled.values as any[];
            values[0] = value ? 1 : 0;
            this._enabled.values = values as [boolean];
        }

        /**
        * The power of 2 used as the size of the FFT to be used to determine the frequency domain.
        */
        //% callInDebugger
        //% group="Sound"
        //% weight=97
        fftPow2Size(): number {
            this.start();            
            const values = this._fftPow2Size.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The power of 2 used as the size of the FFT to be used to determine the frequency domain.
        */
        //% group="Sound"
        //% weight=96
        //% value.min=2
        //% value.max=7
        //% value.defl=5
        setFftPow2Size(value: number) {
            this.start();
            const values = this._fftPow2Size.values as any[];
            values[0] = value;
            this._fftPow2Size.values = values as [number];
        }

        /**
        * The minimum power value in the scaling range for the FFT analysis data
        */
        //% callInDebugger
        //% group="Sound"
        //% weight=95
        minDecibels(): number {
            this.start();            
            const values = this._minDecibels.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The minimum power value in the scaling range for the FFT analysis data
        */
        //% group="Sound"
        //% weight=94
        setMinDecibels(value: number) {
            this.start();
            const values = this._minDecibels.values as any[];
            values[0] = value;
            this._minDecibels.values = values as [number];
        }

        /**
        * The maximum power value in the scaling range for the FFT analysis data
        */
        //% callInDebugger
        //% group="Sound"
        //% weight=93
        maxDecibels(): number {
            this.start();            
            const values = this._maxDecibels.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The maximum power value in the scaling range for the FFT analysis data
        */
        //% group="Sound"
        //% weight=92
        setMaxDecibels(value: number) {
            this.start();
            const values = this._maxDecibels.values as any[];
            values[0] = value;
            this._maxDecibels.values = values as [number];
        }

        /**
        * The averaging constant with the last analysis frame. 
        * If ``0`` is set, there is no averaging done, whereas a value of ``1`` means "overlap the previous and current buffer quite a lot while computing the value".
        */
        //% callInDebugger
        //% group="Sound"
        //% weight=91
        smoothingTimeConstant(): number {
            this.start();            
            const values = this._smoothingTimeConstant.pauseUntilValues() as any[];
            return values[0] * 100;
        }

        /**
        * The averaging constant with the last analysis frame. 
        * If ``0`` is set, there is no averaging done, whereas a value of ``1`` means "overlap the previous and current buffer quite a lot while computing the value".
        */
        //% group="Sound"
        //% weight=90
        //% value.min=0
        //% value.max=100
        //% value.defl=0.8
        setSmoothingTimeConstant(value: number) {
            this.start();
            const values = this._smoothingTimeConstant.values as any[];
            values[0] = value / 100;
            this._smoothingTimeConstant.values = values as [number];
        }

    
    }
    //% fixedInstance whenUsed
    export const soundSpectrum = new SoundSpectrumClient("sound Spectrum");
}
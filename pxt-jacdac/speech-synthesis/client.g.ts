namespace modules {
    /**
     * A speech synthesizer
     **/
    //% fixedInstances blockGap=8
    export class SpeechSynthesisClient extends jacdac.Client {

        private readonly _enabled : jacdac.RegisterClient<[boolean]>;
        private readonly _lang : jacdac.RegisterClient<[string]>;
        private readonly _volume : jacdac.RegisterClient<[number]>;
        private readonly _pitch : jacdac.RegisterClient<[number]>;
        private readonly _rate : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_SPEECH_SYNTHESIS, role);

            this._enabled = this.addRegister<[boolean]>(jacdac.SpeechSynthesisReg.Enabled, "u8");
            this._lang = this.addRegister<[string]>(jacdac.SpeechSynthesisReg.Lang, "s");
            this._volume = this.addRegister<[number]>(jacdac.SpeechSynthesisReg.Volume, "u0.8");
            this._pitch = this.addRegister<[number]>(jacdac.SpeechSynthesisReg.Pitch, "u16.16");
            this._rate = this.addRegister<[number]>(jacdac.SpeechSynthesisReg.Rate, "u16.16");            
        }
    

        /**
        * Determines if the speech engine is in a non-paused state.
        */
        //% callInDebugger
        //% group="Speech synthesis"
        //% block="%speechsynthesis enabled"
        //% blockId=jacdac_speechsynthesis_enabled___get
        //% weight=100
        enabled(): boolean {
            this.start();            
            const values = this._enabled.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * Determines if the speech engine is in a non-paused state.
        */
        //% group="Speech synthesis"
        //% blockId=jacdac_speechsynthesis_enabled___set
        //% block="set %speechsynthesis %value=toggleOnOff"
        //% weight=99
        setEnabled(value: boolean) {
            this.start();
            const values = this._enabled.values as any[];
            values[0] = value ? 1 : 0;
            this._enabled.values = values as [boolean];
        }

        /**
        * Language used for utterances as defined in https://www.ietf.org/rfc/bcp/bcp47.txt.
        */
        //% callInDebugger
        //% group="Speech synthesis"
        //% weight=98
        lang(): string {
            this.start();            
            const values = this._lang.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Language used for utterances as defined in https://www.ietf.org/rfc/bcp/bcp47.txt.
        */
        //% group="Speech synthesis"
        //% weight=97
        setLang(value: string) {
            this.start();
            const values = this._lang.values as any[];
            values[0] = value;
            this._lang.values = values as [string];
        }

        /**
        * Volume for utterances.
        */
        //% callInDebugger
        //% group="Speech synthesis"
        //% weight=96
        volume(): number {
            this.start();            
            const values = this._volume.pauseUntilValues() as any[];
            return values[0] * 100;
        }

        /**
        * Volume for utterances.
        */
        //% group="Speech synthesis"
        //% weight=95
        //% value.min=0
        //% value.max=100
        //% value.defl=1
        setVolume(value: number) {
            this.start();
            const values = this._volume.values as any[];
            values[0] = value / 100;
            this._volume.values = values as [number];
        }

        /**
        * Pitch for utterances
        */
        //% callInDebugger
        //% group="Speech synthesis"
        //% weight=94
        pitch(): number {
            this.start();            
            const values = this._pitch.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Pitch for utterances
        */
        //% group="Speech synthesis"
        //% weight=93
        //% value.min=0
        //% value.max=2
        //% value.defl=1
        setPitch(value: number) {
            this.start();
            const values = this._pitch.values as any[];
            values[0] = value;
            this._pitch.values = values as [number];
        }

        /**
        * Rate for utterances
        */
        //% callInDebugger
        //% group="Speech synthesis"
        //% weight=92
        rate(): number {
            this.start();            
            const values = this._rate.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Rate for utterances
        */
        //% group="Speech synthesis"
        //% weight=91
        //% value.min=0.1
        //% value.max=10
        //% value.defl=1
        setRate(value: number) {
            this.start();
            const values = this._rate.values as any[];
            values[0] = value;
            this._rate.values = values as [number];
        }


        /**
        * Adds an utterance to the utterance queue; it will be spoken when any other utterances queued before it have been spoken.
        */
        //% group="Speech synthesis"
        //% blockId=jacdac_speechsynthesis_speak_cmd
        //% block="%speechsynthesis speak"
        //% weight=90
        speak(text: string): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.SpeechSynthesisCmd.Speak, "s", [text]))
        }

        /**
        * Cancels current utterance and all utterances from the utterance queue.
        */
        //% group="Speech synthesis"
        //% blockId=jacdac_speechsynthesis_cancel_cmd
        //% block="%speechsynthesis cancel"
        //% weight=89
        cancel(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.SpeechSynthesisCmd.Cancel))
        }
    
    }
    //% fixedInstance whenUsed block="speech synthesis 1"
    export const speechSynthesis1 = new SpeechSynthesisClient("speech Synthesis1");
}
namespace modules {
    /**
     * A simple buzzer.
     **/
    //% fixedInstances blockGap=8
    export class BuzzerClient extends jacdac.Client {

        private readonly _volume : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_BUZZER, role);

            this._volume = this.addRegister<[number]>(jacdac.BuzzerReg.Volume, "u0.8");            
        }
    

        /**
        * The volume (duty cycle) of the buzzer.
        */
        //% callInDebugger
        //% group="Sound"
        //% block="%buzzer volume"
        //% blockId=jacdac_buzzer_volume___get
        //% weight=100
        volume(): number {
            this.start();            
            const values = this._volume.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The volume (duty cycle) of the buzzer.
        */
        //% group="Sound"
        //% blockId=jacdac_buzzer_volume___set
        //% block="set %buzzer volume to %value"
        //% weight=99
        //% value.min=0
        //% value.max=1
        //% value.defl=1
        setVolume(value: number) {
            this.start();
            const values = this._volume.values as any[];
            values[0] = value;
            this._volume.values = values as [number];
        }


        /**
        * Play a PWM tone with given period and duty for given duration.
        * The duty is scaled down with `volume` register.
        * To play tone at frequency `F` Hz and volume `V` (in `0..1`) you will want
        * to send `P = 1000000 / F` and `D = P * V / 2`.
        */
        //% group="Sound"
        //% blockId=jacdac_buzzer_play_tone_cmd
        //% block="%buzzer play tone"
        //% weight=98
        playTone(period: number, duty: number, duration: number): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.BuzzerCmd.PlayTone, "u16 u16 u16", [period, duty, duration]))
        }
    
    }
    //% fixedInstance whenUsed
    export const buzzer = new BuzzerClient("buzzer");
}
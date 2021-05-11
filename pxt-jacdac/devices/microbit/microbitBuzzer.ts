namespace microbit {
    // Service: Buzzer
    const SRV_BUZZER = 0x1b57b1d7
    const enum BuzzerReg {
        /**
         * Read-write ratio u0.8 (uint8_t). The volume (duty cycle) of the buzzer.
         *
         * ```
         * const [volume] = jdunpack<[number]>(buf, "u0.8")
         * ```
         */
        Volume = 0x1,
    }

    const enum BuzzerCmd {
        /**
         * Play a PWM tone with given period and duty for given duration.
         * The duty is scaled down with `volume` register.
         * To play tone at frequency `F` Hz and volume `V` (in `0..1`) you will want
         * to send `P = 1000000 / F` and `D = P * V / 2`.
         *
         * ```
         * const [period, duty, duration] = jdunpack<[number, number, number]>(buf, "u16 u16 u16")
         * ```
         */
        PlayTone = 0x80,
    }

    export class BuzzerServer extends jacdac.Server {
        constructor() {
            super("buzzer", SRV_BUZZER)
        }

        public handlePacket(pkt: jacdac.JDPacket) {
            super.handlePacket(pkt)

            // registers
            const oldVol = music.volume();
            const vol = (this.handleRegValue(pkt, BuzzerReg.Volume, "u0.8", oldVol / 0xff) * 0xff) | 0
            if (vol !== oldVol)
                music.setVolume(vol)

            // commands
            switch (pkt.serviceCommand) {
                case BuzzerCmd.PlayTone: this.handlePlayToneCommand(pkt); break;
            }
        }

        private handlePlayToneCommand(pkt: jacdac.JDPacket) {
            const [period, duty, duration] = pkt.jdunpack<[number, number, number]>("u16 u16 u16")
            const frequency = 1000000 / period;
            music.stopAllSounds()
            music.playTone(frequency, duration)
        }
    }

    //% fixedInstance whenUsed
    export const buzzerServer = new BuzzerServer()
}
namespace servers {
    // Service: Sound player
    const SRV_SOUND_PLAYER = 0x1403d338
    const enum SoundPlayerReg {
        /**
         * Read-write ratio u0.16 (uint16_t). Global volume of the output. ``0`` means completely off. This volume is mixed with each play volumes.
         *
         * ```
         * const [volume] = jdunpack<[number]>(buf, "u0.16")
         * ```
         */
        Volume = 0x1,
    }

    const enum SoundPlayerCmd {
        /**
         * Argument: string (bytes). Starts playing a sound.
         *
         * ```
         * const [play] = jdunpack<[string]>(buf, "s")
         * ```
         */
        Play = 0x80,

        /**
         * Argument: sounds_port pipe (bytes). Returns the list of sounds available to play.
         *
         * ```
         * const [soundsPort] = jdunpack<[Buffer]>(buf, "b[12]")
         * ```
         */
        ListSounds = 0x81,
    }

    export class SoundPlayerServer extends jacdac.Server {
        constructor() {
            super("sound player", SRV_SOUND_PLAYER)
        }

        public handlePacket(pkt: jacdac.JDPacket) {
            super.handlePacket(pkt)

            // registers
            const oldVol = music.volume();
            const vol = (this.handleRegValue(pkt, SoundPlayerReg.Volume, "u0.16", oldVol / 255) * 255) | 0
            if (vol !== oldVol)
                music.setVolume(vol)

            // commands
            switch(pkt.serviceCommand) {
                case SoundPlayerCmd.Play: this.handlePlayCommand(pkt); break;
                case SoundPlayerCmd.ListSounds: this.handleListSoundsCommand(pkt); break;
            }
        }

        private handlePlayCommand(pkt: jacdac.JDPacket) {
            const [name] = pkt.jdunpack<[string]>("s")
            if (name) {
                music.stopAllSounds()
                const exp = new SoundExpression(name)
                exp.play()
            }
        }

        private handleListSoundsCommand(pkt: jacdac.JDPacket) {
            const sounds: [number, string][] = [
                [0, "giggle"],
                [0, "happy"],
                [0, "hello"],
                [0, "mysterious"],
                [0, "sad"],
                [0, "slide"],
                [0, "soaring"],
                [0, "spring"],
                [0, "twinkle"],
                [0, "yawn"]
            ]
            jacdac.OutPipe.respondForEach(pkt, sounds, k => {
                return jacdac.jdpack<[number, string]>("u32 s", k)
            })
        }
    }

    //% fixedInstance whenUsed block="sound player"
    export const soundPlayerServer = new SoundPlayerServer()
}
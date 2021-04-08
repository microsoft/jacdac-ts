namespace jacdac {
    // Service: Sound player
    export const SRV_SOUND_PLAYER = 0x1403d338
    export const enum SoundPlayerReg {
        /**
         * Read-write ratio u0.16 (uint16_t). Global volume of the output. ``0`` means completely off. This volume is mixed with each play volumes.
         *
         * ```
         * const [volume] = jdunpack<[number]>(buf, "u0.16")
         * ```
         */
        Volume = 0x1,
    }

    export const enum SoundPlayerCmd {
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


    /**
     * pipe_report ListSoundsPipe
     * ```
     * const [duration, name] = jdunpack<[number, string]>(buf, "u32 s")
     * ```
     */


}

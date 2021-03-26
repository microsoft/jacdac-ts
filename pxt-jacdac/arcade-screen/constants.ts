namespace jacdac {
    // Service: Arcade screen
    export const SRV_ARCADE_SCREEN = 0x16fa36e5

    export const enum ArcadeScreenDisplayFlags { // uint8_t
        ColumnMajor = 0x0,
        RowMajor = 0x1,
        Upscale2x = 0x2,
    }

    export const enum ArcadeScreenCmd {
        /**
         * No args. Announces display capabilities and logical size
         * (320x240 screen with `Upscale2x` will report 160x120).
         */
        Announce = 0x0,

        /**
         * report Announce
         * ```
         * const [flags, bitsPerPixel, width, height] = jdunpack<[jacdac.ArcadeScreenDisplayFlags, number, number, number]>(buf, "u8 u8 u16 u16")
         * ```
         */

        /**
         * Sets the update window for subsequent `set_pixels` commands.
         *
         * ```
         * const [x, y, width, height] = jdunpack<[number, number, number, number]>(buf, "u16 u16 u16 u16")
         * ```
         */
        StartUpdate = 0x81,

        /**
         * Argument: pixels bytes. Set pixels in current window, according to current palette.
         *
         * ```
         * const [pixels] = jdunpack<[Buffer]>(buf, "b")
         * ```
         */
        SetPixels = 0x83,
    }

    export const enum ArcadeScreenReg {
        /**
         * Read-write ratio u0.8 (uint8_t). Set backlight brightness.
         * If set to `0` the display may go to sleep.
         *
         * ```
         * const [brightness] = jdunpack<[number]>(buf, "u0.8")
         * ```
         */
        Brightness = 0x1,

        /**
         * The current palette.
         * The color entry repeats `1 << bits_per_pixel` times.
         * This register may be write-only.
         *
         * ```
         * const [rest] = jdunpack<[([number, number, number])[]]>(buf, "r: u8 u8 u8 x[1]")
         * const [blue, green, red] = rest[0]
         * ```
         */
        Palette = 0x80,
    }

}

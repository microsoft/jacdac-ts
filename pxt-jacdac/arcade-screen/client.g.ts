namespace modules {
    /**
     * A screen with indexed colors.
     * 
     * This is typically run over an SPI connection, not regular single-wire JACDAC.
     **/
    //% fixedInstances blockGap=8
    export class ArcadeScreenClient extends jacdac.Client {

        private readonly _brightness : jacdac.RegisterClient<[number]>;
        private readonly _palette : jacdac.RegisterClient<[([number, number, number])[]]>;            

        constructor(role: string) {
            super(jacdac.SRV_ARCADE_SCREEN, role);

            this._brightness = this.addRegister<[number]>(jacdac.ArcadeScreenReg.Brightness, "u0.8");
            this._palette = this.addRegister<[([number, number, number])[]]>(jacdac.ArcadeScreenReg.Palette, "r: u8 u8 u8 u8");            
        }
    

        /**
        * Set backlight brightness.
        * If set to `0` the display may go to sleep.
        */
        //% callInDebugger
        //% group="Arcade screen"
        //% block="%arcadescreen brightness"
        //% blockId=jacdac_arcadescreen_brightness___get
        //% weight=100
        brightness(): number {
            this.start();            
            const values = this._brightness.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Set backlight brightness.
        * If set to `0` the display may go to sleep.
        */
        //% group="Arcade screen"
        //% blockId=jacdac_arcadescreen_brightness___set
        //% block="set %arcadescreen brightness to %value"
        //% weight=99
        //% value.min=0
        //% value.max=1
        setBrightness(value: number) {
            this.start();
            const values = this._brightness.values as any[];
            values[0] = value;
            this._brightness.values = values as [number];
        }

        /**
        * The current palette.
        * The color entry repeats `1 << bits_per_pixel` times.
        * This register may be write-only.
        */
        //% callInDebugger
        //% group="Arcade screen"
        //% weight=98
        paletteBlue(): ([number, number, number])[] {
            this.start();            
            const values = this._palette.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The current palette.
        * The color entry repeats `1 << bits_per_pixel` times.
        * This register may be write-only.
        */
        //% group="Arcade screen"
        //% weight=97
        setPaletteBlue(value: ([number, number, number])[]) {
            this.start();
            const values = this._palette.values as any[];
            values[0] = value;
            this._palette.values = values as [([number, number, number])[]];
        }

        /**
        * The current palette.
        * The color entry repeats `1 << bits_per_pixel` times.
        * This register may be write-only.
        */
        //% callInDebugger
        //% group="Arcade screen"
        //% weight=96
        paletteGreen(): undefined {
            this.start();            
            const values = this._palette.pauseUntilValues() as any[];
            return values[1];
        }

        /**
        * The current palette.
        * The color entry repeats `1 << bits_per_pixel` times.
        * This register may be write-only.
        */
        //% group="Arcade screen"
        //% weight=95
        setPaletteGreen(value: undefined) {
            this.start();
            const values = this._palette.values as any[];
            values[1] = value;
            this._palette.values = values as [([number, number, number])[]];
        }

        /**
        * The current palette.
        * The color entry repeats `1 << bits_per_pixel` times.
        * This register may be write-only.
        */
        //% callInDebugger
        //% group="Arcade screen"
        //% weight=94
        paletteRed(): undefined {
            this.start();            
            const values = this._palette.pauseUntilValues() as any[];
            return values[2];
        }

        /**
        * The current palette.
        * The color entry repeats `1 << bits_per_pixel` times.
        * This register may be write-only.
        */
        //% group="Arcade screen"
        //% weight=93
        setPaletteRed(value: undefined) {
            this.start();
            const values = this._palette.values as any[];
            values[2] = value;
            this._palette.values = values as [([number, number, number])[]];
        }

        /**
        * The current palette.
        * The color entry repeats `1 << bits_per_pixel` times.
        * This register may be write-only.
        */
        //% callInDebugger
        //% group="Arcade screen"
        //% weight=92
        palettePadding(): undefined {
            this.start();            
            const values = this._palette.pauseUntilValues() as any[];
            return values[3];
        }

        /**
        * The current palette.
        * The color entry repeats `1 << bits_per_pixel` times.
        * This register may be write-only.
        */
        //% group="Arcade screen"
        //% weight=91
        setPalettePadding(value: undefined) {
            this.start();
            const values = this._palette.values as any[];
            values[3] = value;
            this._palette.values = values as [([number, number, number])[]];
        }
 


        /**
        * Announces display capabilities and logical size
        * (320x240 screen with `Upscale2x` will report 160x120).
        */
        //% group="Arcade screen"
        //% blockId=jacdac_arcadescreen_announce_cmd
        //% block="%arcadescreen announce"
        //% weight=90
        announce(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.ArcadeScreenCmd.Announce))
        }

        /**
        * Sets the update window for subsequent `set_pixels` commands.
        */
        //% group="Arcade screen"
        //% blockId=jacdac_arcadescreen_start_update_cmd
        //% block="%arcadescreen start update"
        //% weight=89
        startUpdate(x: number, y: number, width: number, height: number): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.ArcadeScreenCmd.StartUpdate, "u16 u16 u16 u16", [x, y, width, height]))
        }

        /**
        * Set pixels in current window, according to current palette.
        */
        //% group="Arcade screen"
        //% blockId=jacdac_arcadescreen_set_pixels_cmd
        //% block="%arcadescreen set pixels"
        //% weight=88
        setPixels(pixels: Buffer): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.ArcadeScreenCmd.SetPixels, "b", [pixels]))
        }
    
    }
    //% fixedInstance whenUsed
    export const arcadeScreen = new ArcadeScreenClient("arcade Screen");
}
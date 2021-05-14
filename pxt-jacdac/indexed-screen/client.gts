namespace modules {
    /**
     * A screen with indexed colors.
     * 
     * This is often run over an SPI connection, not regular single-wire JACDAC.
     **/
    //% fixedInstances blockGap=8
    export class IndexedScreenClient extends jacdac.Client {

        private readonly _brightness : jacdac.RegisterClient<[number]>;
        private readonly _palette : jacdac.RegisterClient<[([number, number, number])[]]>;
        private readonly _bitsPerPixel : jacdac.RegisterClient<[number]>;
        private readonly _width : jacdac.RegisterClient<[number]>;
        private readonly _height : jacdac.RegisterClient<[number]>;
        private readonly _widthMajor : jacdac.RegisterClient<[boolean]>;
        private readonly _upSampling : jacdac.RegisterClient<[number]>;
        private readonly _rotation : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_INDEXED_SCREEN, role);

            this._brightness = this.addRegister<[number]>(jacdac.IndexedScreenReg.Brightness, "u0.8");
            this._palette = this.addRegister<[([number, number, number])[]]>(jacdac.IndexedScreenReg.Palette, "r: u8 u8 u8 u8");
            this._bitsPerPixel = this.addRegister<[number]>(jacdac.IndexedScreenReg.BitsPerPixel, "u8");
            this._width = this.addRegister<[number]>(jacdac.IndexedScreenReg.Width, "u16");
            this._height = this.addRegister<[number]>(jacdac.IndexedScreenReg.Height, "u16");
            this._widthMajor = this.addRegister<[boolean]>(jacdac.IndexedScreenReg.WidthMajor, "u8");
            this._upSampling = this.addRegister<[number]>(jacdac.IndexedScreenReg.UpSampling, "u8");
            this._rotation = this.addRegister<[number]>(jacdac.IndexedScreenReg.Rotation, "u16");            
        }
    

        /**
        * Set backlight brightness.
        * If set to `0` the display may go to sleep.
        */
        //% callInDebugger
        //% group="Indexed screen"
        //% block="%indexedscreen brightness"
        //% blockId=jacdac_indexedscreen_brightness___get
        //% weight=100
        brightness(): number {
            this.start();            
            const values = this._brightness.pauseUntilValues() as any[];
            return values[0] * 100;
        }

        /**
        * Set backlight brightness.
        * If set to `0` the display may go to sleep.
        */
        //% group="Indexed screen"
        //% blockId=jacdac_indexedscreen_brightness___set
        //% block="set %indexedscreen brightness to %value"
        //% weight=99
        //% value.min=0
        //% value.max=100
        //% value.defl=100
        setBrightness(value: number) {
            this.start();
            const values = this._brightness.values as any[];
            values[0] = value / 100;
            this._brightness.values = values as [number];
        }

        /**
        * The current palette.
        * The color entry repeats `1 << bits_per_pixel` times.
        * This register may be write-only.
        */
        //% callInDebugger
        //% group="Indexed screen"
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
        //% group="Indexed screen"
        //% weight=97
        //% value.min=0
        //% value.max=255
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
        //% group="Indexed screen"
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
        //% group="Indexed screen"
        //% weight=95
        //% value.min=0
        //% value.max=255
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
        //% group="Indexed screen"
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
        //% group="Indexed screen"
        //% weight=93
        //% value.min=0
        //% value.max=255
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
        //% group="Indexed screen"
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
        //% group="Indexed screen"
        //% weight=91
        //% value.min=0
        //% value.max=255
        setPalettePadding(value: undefined) {
            this.start();
            const values = this._palette.values as any[];
            values[3] = value;
            this._palette.values = values as [([number, number, number])[]];
        }

        /**
        * Determines the number of palette entries.
        * Typical values are 1, 2, 4, or 8.
        */
        //% callInDebugger
        //% group="Indexed screen"
        //% weight=90
        bitsPerPixel(): number {
            this.start();            
            const values = this._bitsPerPixel.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Screen width in "natural" orientation.
        */
        //% callInDebugger
        //% group="Indexed screen"
        //% weight=89
        width(): number {
            this.start();            
            const values = this._width.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Screen height in "natural" orientation.
        */
        //% callInDebugger
        //% group="Indexed screen"
        //% weight=88
        height(): number {
            this.start();            
            const values = this._height.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * If true, consecutive pixels in the "width" direction are sent next to each other (this is typical for graphics cards).
        * If false, consecutive pixels in the "height" direction are sent next to each other.
        * For embedded screen controllers, this is typically true iff `width < height`
        * (in other words, it's only true for portrait orientation screens).
        * Some controllers may allow the user to change this (though the refresh order may not be optimal then).
        * This is independent of the `rotation` register.
        */
        //% callInDebugger
        //% group="Indexed screen"
        //% weight=87
        widthMajor(): boolean {
            this.start();            
            const values = this._widthMajor.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * If true, consecutive pixels in the "width" direction are sent next to each other (this is typical for graphics cards).
        * If false, consecutive pixels in the "height" direction are sent next to each other.
        * For embedded screen controllers, this is typically true iff `width < height`
        * (in other words, it's only true for portrait orientation screens).
        * Some controllers may allow the user to change this (though the refresh order may not be optimal then).
        * This is independent of the `rotation` register.
        */
        //% group="Indexed screen"
        //% weight=86
        setWidthMajor(value: boolean) {
            this.start();
            const values = this._widthMajor.values as any[];
            values[0] = value ? 1 : 0;
            this._widthMajor.values = values as [boolean];
        }

        /**
        * Every pixel sent over wire is represented by `up_sampling x up_sampling` square of physical pixels.
        * Some displays may allow changing this (which will also result in changes to `width` and `height`).
        * Typical values are 1 and 2.
        */
        //% callInDebugger
        //% group="Indexed screen"
        //% weight=85
        upSampling(): number {
            this.start();            
            const values = this._upSampling.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Every pixel sent over wire is represented by `up_sampling x up_sampling` square of physical pixels.
        * Some displays may allow changing this (which will also result in changes to `width` and `height`).
        * Typical values are 1 and 2.
        */
        //% group="Indexed screen"
        //% weight=84
        //% value.min=0
        //% value.max=255
        setUpSampling(value: number) {
            this.start();
            const values = this._upSampling.values as any[];
            values[0] = value;
            this._upSampling.values = values as [number];
        }

        /**
        * Possible values are 0, 90, 180 and 270 only.
        * Write to this register do not affect `width` and `height` registers,
        * and may be ignored by some screens.
        */
        //% callInDebugger
        //% group="Indexed screen"
        //% weight=83
        rotation(): number {
            this.start();            
            const values = this._rotation.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Possible values are 0, 90, 180 and 270 only.
        * Write to this register do not affect `width` and `height` registers,
        * and may be ignored by some screens.
        */
        //% group="Indexed screen"
        //% weight=82
        setRotation(value: number) {
            this.start();
            const values = this._rotation.values as any[];
            values[0] = value;
            this._rotation.values = values as [number];
        }


        /**
        * Sets the update window for subsequent `set_pixels` commands.
        */
        //% group="Indexed screen"
        //% blockId=jacdac_indexedscreen_start_update_cmd
        //% block="%indexedscreen start update"
        //% weight=81
        startUpdate(x: number, y: number, width: number, height: number): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.IndexedScreenCmd.StartUpdate, "u16 u16 u16 u16", [x, y, width, height]))
        }

        /**
        * Set pixels in current window, according to current palette.
        * Each "line" of data is aligned to a byte.
        */
        //% group="Indexed screen"
        //% blockId=jacdac_indexedscreen_set_pixels_cmd
        //% block="%indexedscreen set pixels"
        //% weight=80
        setPixels(pixels: Buffer): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.IndexedScreenCmd.SetPixels, "b", [pixels]))
        }
    
    }
    //% fixedInstance whenUsed block="indexed screen 1"
    export const indexedScreen1 = new IndexedScreenClient("indexed Screen1");
}
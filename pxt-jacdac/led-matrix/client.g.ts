namespace modules {
    /**
     * A rectangular monochrome LED matrix controller.
     **/
    //% fixedInstances blockGap=8
    export class LedMatrixClient extends jacdac.Client {

        private readonly _leds : jacdac.RegisterClient<[Buffer]>;
        private readonly _brightness : jacdac.RegisterClient<[number]>;
        private readonly _rows : jacdac.RegisterClient<[number]>;
        private readonly _columns : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_LED_MATRIX, role);

            this._leds = this.addRegister<[Buffer]>(jacdac.LedMatrixReg.Leds, "b");
            this._brightness = this.addRegister<[number]>(jacdac.LedMatrixReg.Brightness, "u0.8");
            this._rows = this.addRegister<[number]>(jacdac.LedMatrixReg.Rows, "u16");
            this._columns = this.addRegister<[number]>(jacdac.LedMatrixReg.Columns, "u16");            
        }
    

        /**
        * The state of the screen where pixel on/off state is 
        * stored as a bit, column by column. The column should be byte aligned.
        */
        //% callInDebugger
        //% group="Display"
        //% block="%ledmatrix leds"
        //% blockId=jacdac_ledmatrix_leds___get
        //% weight=100
        leds(): Buffer {
            this.start();            
            const values = this._leds.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The state of the screen where pixel on/off state is 
        * stored as a bit, column by column. The column should be byte aligned.
        */
        //% group="Display"
        //% blockId=jacdac_ledmatrix_leds___set
        //% block="set %ledmatrix leds to %value"
        //% weight=99
        setLeds(value: Buffer) {
            this.start();
            const values = this._leds.values as any[];
            values[0] = value;
            this._leds.values = values as [Buffer];
        }

        /**
        * Reads the general brightness of the LEDs. ``0`` when the screen is off.
        */
        //% callInDebugger
        //% group="Display"
        //% block="%ledmatrix brightness"
        //% blockId=jacdac_ledmatrix_brightness___get
        //% weight=98
        brightness(): number {
            this.start();            
            const values = this._brightness.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Reads the general brightness of the LEDs. ``0`` when the screen is off.
        */
        //% group="Display"
        //% blockId=jacdac_ledmatrix_brightness___set
        //% block="set %ledmatrix brightness to %value"
        //% weight=97
        //% value.min=0
        //% value.max=1
        setBrightness(value: number) {
            this.start();
            const values = this._brightness.values as any[];
            values[0] = value;
            this._brightness.values = values as [number];
        }

        /**
        * Number of rows on the screen
        */
        //% callInDebugger
        //% group="Display"
        //% weight=96
        rows(): number {
            this.start();            
            const values = this._rows.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Number of columns on the screen
        */
        //% callInDebugger
        //% group="Display"
        //% weight=95
        columns(): number {
            this.start();            
            const values = this._columns.pauseUntilValues() as any[];
            return values[0];
        }

    
    }
    //% fixedInstance whenUsed
    export const ledMatrix = new LedMatrixClient("led Matrix");
}
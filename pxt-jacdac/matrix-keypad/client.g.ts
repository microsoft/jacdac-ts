namespace modules {
    /**
     * A matrix of buttons connected as a keypad
     **/
    //% fixedInstances blockGap=8
    export class MatrixKeypadClient extends jacdac.SensorClient<[number[]]> {

        private readonly _rows : jacdac.RegisterClient<[number]>;
        private readonly _columns : jacdac.RegisterClient<[number]>;
        private readonly _labels : jacdac.RegisterClient<[string[]]>;
        private readonly _variant : jacdac.RegisterClient<[jacdac.MatrixKeypadVariant]>;            

        constructor(role: string) {
            super(jacdac.SRV_MATRIX_KEYPAD, role, "r: u8");

            this._rows = this.addRegister<[number]>(jacdac.MatrixKeypadReg.Rows, "u8");
            this._columns = this.addRegister<[number]>(jacdac.MatrixKeypadReg.Columns, "u8");
            this._labels = this.addRegister<[string[]]>(jacdac.MatrixKeypadReg.Labels, "r: z");
            this._variant = this.addRegister<[jacdac.MatrixKeypadVariant]>(jacdac.MatrixKeypadReg.Variant, "u8");            
        }
    

        /**
        * The coordinate of the button currently pressed. Keys are zero-indexed from left to right, top to bottom:
        * ``row = index / columns``, ``column = index % columns``.
        */
        //% callInDebugger
        //% group="Button"
        //% block="%matrixkeypad index"
        //% blockId=jacdac_matrixkeypad_pressed_index_get
        //% weight=100
        index(): number[] {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Number of rows in the matrix
        */
        //% callInDebugger
        //% group="Button"
        //% weight=99
        rows(): number {
            this.start();            
            const values = this._rows.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Number of columns in the matrix
        */
        //% callInDebugger
        //% group="Button"
        //% weight=98
        columns(): number {
            this.start();            
            const values = this._columns.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The characters printed on the keys if any, in indexing sequence.
        */
        //% callInDebugger
        //% group="Button"
        //% weight=97
        labelsLabel(): string[] {
            this.start();            
            const values = this._labels.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The type of physical keypad. If the variant is ``ElastomerLEDPixel``
        * and the next service on the device is a ``LEDPixel`` service, it is considered
        * as the service controlling the LED pixel on the keypad.
        */
        //% callInDebugger
        //% group="Button"
        //% weight=96
        variant(): jacdac.MatrixKeypadVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Emitted when a key, at the given index, goes from inactive (`pressed == 0`) to active.
         */
        //% group="Button"
        //% blockId=jacdac_on_matrixkeypad_down
        //% block="on %matrixkeypad down"
        //% weight=95
        onDown(handler: () => void): void {
            this.registerEvent(jacdac.MatrixKeypadEvent.Down, handler);
        }
        /**
         * Emitted when a key, at the given index, goes from active (`pressed == 1`) to inactive.
         */
        //% group="Button"
        //% blockId=jacdac_on_matrixkeypad_up
        //% block="on %matrixkeypad up"
        //% weight=94
        onUp(handler: () => void): void {
            this.registerEvent(jacdac.MatrixKeypadEvent.Up, handler);
        }
        /**
         * Emitted together with `up` when the press time was not longer than 500ms.
         */
        //% group="Button"
        //% blockId=jacdac_on_matrixkeypad_click
        //% block="on %matrixkeypad click"
        //% weight=93
        onClick(handler: () => void): void {
            this.registerEvent(jacdac.MatrixKeypadEvent.Click, handler);
        }
        /**
         * Emitted together with `up` when the press time was more than 500ms.
         */
        //% group="Button"
        //% blockId=jacdac_on_matrixkeypad_long_click
        //% block="on %matrixkeypad long click"
        //% weight=92
        onLongClick(handler: () => void): void {
            this.registerEvent(jacdac.MatrixKeypadEvent.LongClick, handler);
        }
    
    }
    //% fixedInstance whenUsed
    export const matrixKeypad = new MatrixKeypadClient("matrix Keypad");
}
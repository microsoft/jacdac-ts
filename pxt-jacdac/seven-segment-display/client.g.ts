namespace modules {
    /**
     * A 7-segment numeric display, with one or more digits.
     **/
    //% fixedInstances blockGap=8
    export class SevenSegmentDisplayClient extends jacdac.Client {

        private readonly _digits : jacdac.RegisterClient<[Buffer]>;
        private readonly _brightness : jacdac.RegisterClient<[number]>;
        private readonly _doubleDots : jacdac.RegisterClient<[boolean]>;
        private readonly _digitCount : jacdac.RegisterClient<[number]>;
        private readonly _decimalPoint : jacdac.RegisterClient<[boolean]>;            

        constructor(role: string) {
            super(jacdac.SRV_SEVEN_SEGMENT_DISPLAY, role);

            this._digits = this.addRegister<[Buffer]>(jacdac.SevenSegmentDisplayReg.Digits, "b");
            this._brightness = this.addRegister<[number]>(jacdac.SevenSegmentDisplayReg.Brightness, "u0.16");
            this._doubleDots = this.addRegister<[boolean]>(jacdac.SevenSegmentDisplayReg.DoubleDots, "u8");
            this._digitCount = this.addRegister<[number]>(jacdac.SevenSegmentDisplayReg.DigitCount, "u8");
            this._decimalPoint = this.addRegister<[boolean]>(jacdac.SevenSegmentDisplayReg.DecimalPoint, "u8");            
        }
    

        /**
        * Each byte encodes the display status of a digit using, 
        * where bit 0 encodes segment `A`, bit 1 encodes segments `B`, ..., bit 6 encodes segments `G`, and bit 7 encodes the decimal point (if present).
        * If incoming ``digits`` data is smaller than `digit_count`, the remaining digits will be cleared.
        * Thus, sending an empty ``digits`` payload clears the screen.
        * 
        * ```text
        *  - A -
        *  G   B
        *  |   |
        *  - F -
        *  |   |   -
        *  E   C  |DP|
        *  - D -   -
        * ```
        */
        //% callInDebugger
        //% group="Display"
        //% block="%sevensegmentdisplay digits"
        //% blockId=jacdac_sevensegmentdisplay_digits___get
        //% weight=100
        digits(): Buffer {
            this.start();            
            const values = this._digits.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Each byte encodes the display status of a digit using, 
        * where bit 0 encodes segment `A`, bit 1 encodes segments `B`, ..., bit 6 encodes segments `G`, and bit 7 encodes the decimal point (if present).
        * If incoming ``digits`` data is smaller than `digit_count`, the remaining digits will be cleared.
        * Thus, sending an empty ``digits`` payload clears the screen.
        * 
        * ```text
        *  - A -
        *  G   B
        *  |   |
        *  - F -
        *  |   |   -
        *  E   C  |DP|
        *  - D -   -
        * ```
        */
        //% group="Display"
        //% blockId=jacdac_sevensegmentdisplay_digits___set
        //% block="set %sevensegmentdisplay digits to %value"
        //% weight=99
        setDigits(value: Buffer) {
            this.start();
            const values = this._digits.values as any[];
            values[0] = value;
            this._digits.values = values as [Buffer];
        }

        /**
        * Controls the brightness of the LEDs. ``0`` means off.
        */
        //% callInDebugger
        //% group="Display"
        //% block="%sevensegmentdisplay brightness"
        //% blockId=jacdac_sevensegmentdisplay_brightness___get
        //% weight=98
        brightness(): number {
            this.start();            
            const values = this._brightness.pauseUntilValues() as any[];
            return values[0] * 100;
        }

        /**
        * Controls the brightness of the LEDs. ``0`` means off.
        */
        //% group="Display"
        //% blockId=jacdac_sevensegmentdisplay_brightness___set
        //% block="set %sevensegmentdisplay brightness to %value"
        //% weight=97
        //% value.min=0
        //% value.max=100
        setBrightness(value: number) {
            this.start();
            const values = this._brightness.values as any[];
            values[0] = value / 100;
            this._brightness.values = values as [number];
        }

        /**
        * Turn on or off the column LEDs (separating minutes from hours, etc.) in of the segment.
        * If the column LEDs is not supported, the value remains false.
        */
        //% callInDebugger
        //% group="Display"
        //% weight=96
        doubleDots(): boolean {
            this.start();            
            const values = this._doubleDots.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * Turn on or off the column LEDs (separating minutes from hours, etc.) in of the segment.
        * If the column LEDs is not supported, the value remains false.
        */
        //% group="Display"
        //% weight=95
        setDoubleDots(value: boolean) {
            this.start();
            const values = this._doubleDots.values as any[];
            values[0] = value ? 1 : 0;
            this._doubleDots.values = values as [boolean];
        }

        /**
        * The number of digits available on the display.
        */
        //% callInDebugger
        //% group="Display"
        //% weight=94
        digitCount(): number {
            this.start();            
            const values = this._digitCount.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * True if decimal points are available (on all digits).
        */
        //% callInDebugger
        //% group="Display"
        //% weight=93
        decimalPoint(): boolean {
            this.start();            
            const values = this._decimalPoint.pauseUntilValues() as any[];
            return !!values[0];
        }

    
    }
    //% fixedInstance whenUsed
    export const sevenSegmentDisplay = new SevenSegmentDisplayClient("seven Segment Display");
}
namespace modules {
    /**
     * A screen that displays characters.
     **/
    //% fixedInstances blockGap=8
    export class CharacterScreenClient extends jacdac.Client {

        private readonly _message : jacdac.RegisterClient<[string]>;
        private readonly _brightness : jacdac.RegisterClient<[number]>;
        private readonly _variant : jacdac.RegisterClient<[jacdac.CharacterScreenVariant]>;
        private readonly _textDirection : jacdac.RegisterClient<[jacdac.CharacterScreenTextDirection]>;
        private readonly _rows : jacdac.RegisterClient<[number]>;
        private readonly _columns : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_CHARACTER_SCREEN, role);

            this._message = this.addRegister<[string]>(jacdac.CharacterScreenReg.Message, "s");
            this._brightness = this.addRegister<[number]>(jacdac.CharacterScreenReg.Brightness, "u0.8");
            this._variant = this.addRegister<[jacdac.CharacterScreenVariant]>(jacdac.CharacterScreenReg.Variant, "u8");
            this._textDirection = this.addRegister<[jacdac.CharacterScreenTextDirection]>(jacdac.CharacterScreenReg.TextDirection, "u8");
            this._rows = this.addRegister<[number]>(jacdac.CharacterScreenReg.Rows, "u8");
            this._columns = this.addRegister<[number]>(jacdac.CharacterScreenReg.Columns, "u8");            
        }
    

        /**
        * Text to show. Use `\n` to break lines.
        */
        //% callInDebugger
        //% group="Display"
        //% block="%characterscreen message"
        //% blockId=jacdac_characterscreen_message___get
        //% weight=100
        message(): string {
            this.start();            
            const values = this._message.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Text to show. Use `\n` to break lines.
        */
        //% group="Display"
        //% blockId=jacdac_characterscreen_message___set
        //% block="set %characterscreen message to %value"
        //% weight=99
        setMessage(value: string) {
            this.start();
            const values = this._message.values as any[];
            values[0] = value;
            this._message.values = values as [string];
        }

        /**
        * Brightness of the screen. `0` means off.
        */
        //% callInDebugger
        //% group="Display"
        //% block="%characterscreen brightness"
        //% blockId=jacdac_characterscreen_brightness___get
        //% weight=98
        brightness(): number {
            this.start();            
            const values = this._brightness.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Brightness of the screen. `0` means off.
        */
        //% group="Display"
        //% blockId=jacdac_characterscreen_brightness___set
        //% block="set %characterscreen brightness to %value"
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
        * Describes the type of character LED screen.
        */
        //% callInDebugger
        //% group="Display"
        //% weight=96
        variant(): jacdac.CharacterScreenVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Specifies the RTL or LTR direction of the text.
        */
        //% callInDebugger
        //% group="Display"
        //% weight=95
        textDirection(): jacdac.CharacterScreenTextDirection {
            this.start();            
            const values = this._textDirection.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Specifies the RTL or LTR direction of the text.
        */
        //% group="Display"
        //% weight=94
        setTextDirection(value: jacdac.CharacterScreenTextDirection) {
            this.start();
            const values = this._textDirection.values as any[];
            values[0] = value;
            this._textDirection.values = values as [jacdac.CharacterScreenTextDirection];
        }

        /**
        * Gets the number of rows.
        */
        //% callInDebugger
        //% group="Display"
        //% weight=93
        rows(): number {
            this.start();            
            const values = this._rows.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Gets the number of columns.
        */
        //% callInDebugger
        //% group="Display"
        //% weight=92
        columns(): number {
            this.start();            
            const values = this._columns.pauseUntilValues() as any[];
            return values[0];
        }

    
    }
    //% fixedInstance whenUsed
    export const characterScreen = new CharacterScreenClient("character Screen");
}
namespace modules {
    /**
     * A controller for 1 or more monochrome or RGB LEDs connected in parallel.
     **/
    //% fixedInstances blockGap=8
    export class LedClient extends jacdac.Client {

        private readonly _color : jacdac.RegisterClient<[number,number,number]>;
        private readonly _maxPower : jacdac.RegisterClient<[number]>;
        private readonly _ledCount : jacdac.RegisterClient<[number]>;
        private readonly _waveLength : jacdac.RegisterClient<[number]>;
        private readonly _luminousIntensity : jacdac.RegisterClient<[number]>;
        private readonly _variant : jacdac.RegisterClient<[jacdac.LedVariant]>;            

        constructor(role: string) {
            super(jacdac.SRV_LED, role);

            this._color = this.addRegister<[number,number,number]>(jacdac.LedReg.Color, "u8 u8 u8");
            this._maxPower = this.addRegister<[number]>(jacdac.LedReg.MaxPower, "u16");
            this._ledCount = this.addRegister<[number]>(jacdac.LedReg.LedCount, "u16");
            this._waveLength = this.addRegister<[number]>(jacdac.LedReg.WaveLength, "u16");
            this._luminousIntensity = this.addRegister<[number]>(jacdac.LedReg.LuminousIntensity, "u16");
            this._variant = this.addRegister<[jacdac.LedVariant]>(jacdac.LedReg.Variant, "u8");            
        }
    

        /**
        * The current color of the LED.
        */
        //% callInDebugger
        //% group="Light"
        //% weight=100
        colorRed(): number {
            this.start();            
            const values = this._color.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The current color of the LED.
        */
        //% callInDebugger
        //% group="Light"
        //% weight=99
        colorGreen(): number {
            this.start();            
            const values = this._color.pauseUntilValues() as any[];
            return values[1];
        }

        /**
        * The current color of the LED.
        */
        //% callInDebugger
        //% group="Light"
        //% weight=98
        colorBlue(): number {
            this.start();            
            const values = this._color.pauseUntilValues() as any[];
            return values[2];
        }

        /**
        * Limit the power drawn by the light-strip (and controller).
        */
        //% callInDebugger
        //% group="Light"
        //% weight=97
        maxPower(): number {
            this.start();            
            const values = this._maxPower.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Limit the power drawn by the light-strip (and controller).
        */
        //% group="Light"
        //% weight=96
        //% value.defl=100
        setMaxPower(value: number) {
            this.start();
            const values = this._maxPower.values as any[];
            values[0] = value;
            this._maxPower.values = values as [number];
        }

        /**
        * If known, specifies the number of LEDs in parallel on this device.
        */
        //% callInDebugger
        //% group="Light"
        //% weight=95
        ledCount(): number {
            this.start();            
            const values = this._ledCount.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * If monochrome LED, specifies the wave length of the LED.
        */
        //% callInDebugger
        //% group="Light"
        //% weight=94
        waveLength(): number {
            this.start();            
            const values = this._waveLength.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The luminous intensity of the LED, at full value, in micro candella.
        */
        //% callInDebugger
        //% group="Light"
        //% weight=93
        luminousIntensity(): number {
            this.start();            
            const values = this._luminousIntensity.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The physical type of LED.
        */
        //% callInDebugger
        //% group="Light"
        //% weight=92
        variant(): jacdac.LedVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }


        /**
        * Animates the LED to the given color. Leave speed to 0 to make the change instanuous.
        */
        //% group="Light"
        //% blockId=jacdac_led_animate_cmd
        //% block="animate %led to %color at speed %speed"
        //% weight=91
        //% color.shadow="colorNumberPicker"
        animate(color: number, speed: number): void {
            this.start();
            const r = (color << 16) & 0xff
            const g = (color << 8) & 0xff
            const b = color & 0xff
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.LedCmd.Animate, "u8 u8 u8 u8", [r, g, b, speed]))
        }
    
    }
    //% fixedInstance whenUsed block="led 1"
    export const led1 = new LedClient("led1");
}
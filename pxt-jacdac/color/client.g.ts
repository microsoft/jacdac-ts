namespace modules {
    /**
     * Senses RGB colors
     **/
    //% fixedInstances blockGap=8
    export class ColorClient extends jacdac.SensorClient<[number,number,number]> {
            

        constructor(role: string) {
            super(jacdac.SRV_COLOR, role, "u0.16 u0.16 u0.16");
            
        }
    

        /**
        * Detected color in the RGB color space.
        */
        //% callInDebugger
        //% group="Imaging"
        //% block="%color red"
        //% blockId=jacdac_color_color_red_get
        //% weight=100
        red(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[0] * 100;
        }

        /**
        * Detected color in the RGB color space.
        */
        //% callInDebugger
        //% group="Imaging"
        //% block="%color green"
        //% blockId=jacdac_color_color_green_get
        //% weight=99
        green(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[1] * 100;
        }

        /**
        * Detected color in the RGB color space.
        */
        //% callInDebugger
        //% group="Imaging"
        //% block="%color blue"
        //% blockId=jacdac_color_color_blue_get
        //% weight=98
        blue(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[2] * 100;
        }

    
    }
    //% fixedInstance whenUsed block="color 1"
    export const color1 = new ColorClient("color1");
}
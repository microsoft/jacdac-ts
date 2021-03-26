namespace modules {
    /**
     * A sensor that detects light and dark surfaces, commonly used for line following robots.
     **/
    //% fixedInstances blockGap=8
    export class ReflectedLightClient extends jacdac.SimpleSensorClient {

        private readonly _variant : jacdac.RegisterClient<[jacdac.ReflectedLightVariant]>;            

        constructor(role: string) {
            super(jacdac.SRV_REFLECTED_LIGHT, role, "u0.16");

            this._variant = this.addRegister<[jacdac.ReflectedLightVariant]>(jacdac.ReflectedLightReg.Variant, "u8");            
        }
    

        /**
        * Reports the reflected brightness. It may be a digital value or, for some sensor, analog value.
        */
        //% callInDebugger
        //% group="Imaging"
        //% block="%reflectedlight brightness"
        //% blockId=jacdac_reflectedlight_brightness___get
        //% weight=100
        brightness(): number {
            return this.reading();
        
        }

        /**
        * Type of physical sensor used
        */
        //% callInDebugger
        //% group="Imaging"
        //% weight=99
        variant(): jacdac.ReflectedLightVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the brightness changes by the given threshold value.
        */
        //% group="Imaging"
        //% blockId=jacdac_reflectedlight_on_brightness_change
        //% block="on %reflectedlight brightness changed by %threshold"
        //% weight=98
        //% threshold.defl=0.1
        onBrightnessChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

        /**
         * The sensor detected a transition from light to dark
         */
        //% group="Imaging"
        //% blockId=jacdac_on_reflectedlight_dark
        //% block="on %reflectedlight dark"
        //% weight=97
        onDark(handler: () => void): void {
            this.registerEvent(jacdac.ReflectedLightEvent.Dark, handler);
        }
        /**
         * The sensor detected a transition from dark to light
         */
        //% group="Imaging"
        //% blockId=jacdac_on_reflectedlight_light
        //% block="on %reflectedlight light"
        //% weight=96
        onLight(handler: () => void): void {
            this.registerEvent(jacdac.ReflectedLightEvent.Light, handler);
        }
    
    }
    //% fixedInstance whenUsed
    export const reflectedLight = new ReflectedLightClient("reflected Light");
}
namespace modules {
    /**
     * An incremental rotary encoder - converts angular motion of a shaft to digital signal.
     **/
    //% fixedInstances blockGap=8
    export class RotaryEncoderClient extends jacdac.SimpleSensorClient {

        private readonly _clicksPerTurn : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_ROTARY_ENCODER, role, "i32");

            this._clicksPerTurn = this.addRegister<[number]>(jacdac.RotaryEncoderReg.ClicksPerTurn, "u16");            
        }
    

        /**
        * Upon device reset starts at `0` (regardless of the shaft position).
        * Increases by `1` for a clockwise "click", by `-1` for counter-clockwise.
        */
        //% callInDebugger
        //% group="Slider"
        //% block="%rotaryencoder position"
        //% blockId=jacdac_rotaryencoder_position___get
        //% weight=100
        position(): number {
            return this.reading();
        
        }

        /**
        * This specifies by how much `position` changes when the crank does 360 degree turn. Typically 12 or 24.
        */
        //% callInDebugger
        //% group="Slider"
        //% weight=99
        clicksPerTurn(): number {
            this.start();            
            const values = this._clicksPerTurn.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the position changes by the given threshold value.
        */
        //% group="Slider"
        //% blockId=jacdac_rotaryencoder_on_position_change
        //% block="on %rotaryencoder position changed by %threshold"
        //% weight=98
        //% threshold.defl=1
        onPositionChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

    
    }
    //% fixedInstance whenUsed block="rotary encoder 1"
    export const rotaryEncoder1 = new RotaryEncoderClient("rotary Encoder1");
}
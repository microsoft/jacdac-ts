namespace modules {
    /**
     * A sensor that determines the distance of an object without any physical contact involved.
     **/
    //% fixedInstances blockGap=8
    export class DistanceClient extends jacdac.SimpleSensorClient {

        private readonly _minRange : jacdac.RegisterClient<[number]>;
        private readonly _maxRange : jacdac.RegisterClient<[number]>;
        private readonly _variant : jacdac.RegisterClient<[jacdac.DistanceVariant]>;            

        constructor(role: string) {
            super(jacdac.SRV_DISTANCE, role, "u16.16");

            this._minRange = this.addRegister<[number]>(jacdac.DistanceReg.MinRange, "u16.16");
            this._maxRange = this.addRegister<[number]>(jacdac.DistanceReg.MaxRange, "u16.16");
            this._variant = this.addRegister<[jacdac.DistanceVariant]>(jacdac.DistanceReg.Variant, "u8");            
        }
    

        /**
        * Current distance from the object
        */
        //% callInDebugger
        //% group="Distance"
        //% block="%distance distance"
        //% blockId=jacdac_distance_distance___get
        //% weight=100
        distance(): number {
            return this.reading();
        
        }

        /**
        * Minimum measurable distance
        */
        //% callInDebugger
        //% group="Distance"
        //% weight=99
        minRange(): number {
            this.start();            
            const values = this._minRange.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Maximum measurable distance
        */
        //% callInDebugger
        //% group="Distance"
        //% weight=98
        maxRange(): number {
            this.start();            
            const values = this._maxRange.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Determines the type of sensor used.
        */
        //% callInDebugger
        //% group="Distance"
        //% weight=97
        variant(): jacdac.DistanceVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the distance changes by the given threshold value.
        */
        //% group="Distance"
        //% blockId=jacdac_distance_on_distance_change
        //% block="on %distance distance changed by %threshold"
        //% weight=96
        //% threshold.defl=1
        onDistanceChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

    
    }
    //% fixedInstance whenUsed block="distance 1"
    export const distance1 = new DistanceClient("distance1");
}
namespace modules {
    /**
     * Measures equivalent Total Volatile Organic Compound levels.
     **/
    //% fixedInstances blockGap=8
    export class TvocClient extends jacdac.SimpleSensorClient {

        private readonly _tVOCError : jacdac.RegisterClient<[number]>;
        private readonly _minTVOC : jacdac.RegisterClient<[number]>;
        private readonly _maxTVOC : jacdac.RegisterClient<[number]>;
        private readonly _conditioningPeriod : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_TVOC, role, "u22.10");

            this._tVOCError = this.addRegister<[number]>(jacdac.TvocReg.TVOCError, "u22.10");
            this._minTVOC = this.addRegister<[number]>(jacdac.TvocReg.MinTVOC, "u22.10");
            this._maxTVOC = this.addRegister<[number]>(jacdac.TvocReg.MaxTVOC, "u22.10");
            this._conditioningPeriod = this.addRegister<[number]>(jacdac.TvocReg.ConditioningPeriod, "u32");            
        }
    

        /**
        * Total volatile organic compound readings in parts per billion.
        */
        //% callInDebugger
        //% group="Environment"
        //% block="%tvoc TVOC"
        //% blockId=jacdac_tvoc_TVOC___get
        //% weight=100
        tVOC(): number {
            return this.reading();
        
        }

        /**
        * Error on the reading data
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=99
        tVOCError(): number {
            this.start();            
            const values = this._tVOCError.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Minimum measurable value
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=98
        minTVOC(): number {
            this.start();            
            const values = this._minTVOC.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Minimum measurable value
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=97
        maxTVOC(): number {
            this.start();            
            const values = this._maxTVOC.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Time required to achieve good sensor stability before measuring after long idle period.
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=96
        conditioningPeriod(): number {
            this.start();            
            const values = this._conditioningPeriod.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the TVOC changes by the given threshold value.
        */
        //% group="Environment"
        //% blockId=jacdac_tvoc_on_TVOC_change
        //% block="on %tvoc TVOC changed by %threshold"
        //% weight=95
        //% threshold.defl=1
        onTVOCChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

    
    }
    //% fixedInstance whenUsed
    export const tvoc = new TvocClient("tvoc");
}
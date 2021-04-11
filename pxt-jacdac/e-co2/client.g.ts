namespace modules {
    /**
     * Measures equivalent CO₂ levels.
     **/
    //% fixedInstances blockGap=8
    export class ECO2Client extends jacdac.SimpleSensorClient {

        private readonly _eCO2Error : jacdac.RegisterClient<[number]>;
        private readonly _minECO2 : jacdac.RegisterClient<[number]>;
        private readonly _maxECO2 : jacdac.RegisterClient<[number]>;
        private readonly _conditioningPeriod : jacdac.RegisterClient<[number]>;
        private readonly _variant : jacdac.RegisterClient<[jacdac.ECO2Variant]>;            

        constructor(role: string) {
            super(jacdac.SRV_E_CO2, role, "u22.10");

            this._eCO2Error = this.addRegister<[number]>(jacdac.ECO2Reg.ECO2Error, "u22.10");
            this._minECO2 = this.addRegister<[number]>(jacdac.ECO2Reg.MinECO2, "u22.10");
            this._maxECO2 = this.addRegister<[number]>(jacdac.ECO2Reg.MaxECO2, "u22.10");
            this._conditioningPeriod = this.addRegister<[number]>(jacdac.ECO2Reg.ConditioningPeriod, "u32");
            this._variant = this.addRegister<[jacdac.ECO2Variant]>(jacdac.ECO2Reg.Variant, "u8");            
        }
    

        /**
        * Equivalent CO₂ (eCO₂) readings.
        */
        //% callInDebugger
        //% group="Environment"
        //% block="%eco2 e CO2"
        //% blockId=jacdac_eco2_e_CO2___get
        //% weight=100
        eCO2(): number {
            return this.reading();
        
        }

        /**
        * Error on the reading value.
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=99
        eCO2Error(): number {
            this.start();            
            const values = this._eCO2Error.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Minimum measurable value
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=98
        minECO2(): number {
            this.start();            
            const values = this._minECO2.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Minimum measurable value
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=97
        maxECO2(): number {
            this.start();            
            const values = this._maxECO2.pauseUntilValues() as any[];
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
        * Type of physical sensor and capabilities.
        */
        //% callInDebugger
        //% group="Environment"
        //% weight=95
        variant(): jacdac.ECO2Variant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the e CO2 changes by the given threshold value.
        */
        //% group="Environment"
        //% blockId=jacdac_eco2_on_e_CO2_change
        //% block="on %eco2 e CO2 changed by %threshold"
        //% weight=94
        //% threshold.defl=1
        onECO2ChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }

    
    }
    //% fixedInstance whenUsed block="e co2 1"
    export const eCO21 = new ECO2Client("e CO21");
}
namespace modules {
    /**
     * A push-pull solenoid is a type of relay that pulls a coil when activated.
     **/
    //% fixedInstances blockGap=8
    export class SolenoidClient extends jacdac.Client {

        private readonly _pulled : jacdac.RegisterClient<[boolean]>;
        private readonly _variant : jacdac.RegisterClient<[jacdac.SolenoidVariant]>;            

        constructor(role: string) {
            super(jacdac.SRV_SOLENOID, role);

            this._pulled = this.addRegister<[boolean]>(jacdac.SolenoidReg.Pulled, "u8");
            this._variant = this.addRegister<[jacdac.SolenoidVariant]>(jacdac.SolenoidReg.Variant, "u8");            
        }
    

        /**
        * Indicates whether the solenoid is energized and pulled (on) or pushed (off).
        */
        //% callInDebugger
        //% group="Solenoid"
        //% block="%solenoid pulled"
        //% blockId=jacdac_solenoid_pulled___get
        //% weight=100
        pulled(): boolean {
            this.start();            
            const values = this._pulled.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * Indicates whether the solenoid is energized and pulled (on) or pushed (off).
        */
        //% group="Solenoid"
        //% blockId=jacdac_solenoid_pulled___set
        //% block="set %solenoid pulled to %value"
        //% weight=99
        setPulled(value: boolean) {
            this.start();
            const values = this._pulled.values as any[];
            values[0] = value ? 1 : 0;
            this._pulled.values = values as [boolean];
        }

        /**
        * Describes the type of solenoid used.
        */
        //% callInDebugger
        //% group="Solenoid"
        //% weight=98
        variant(): jacdac.SolenoidVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

    
    }
    //% fixedInstance whenUsed
    export const solenoid = new SolenoidClient("solenoid");
}
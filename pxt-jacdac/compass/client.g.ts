namespace modules {
    /**
     * A sensor that measures the heading.
     **/
    //% fixedInstances blockGap=8
    export class CompassClient extends jacdac.SimpleSensorClient {

        private readonly _enabled : jacdac.RegisterClient<[boolean]>;
        private readonly _headingError : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_COMPASS, role, "u16.16");

            this._enabled = this.addRegister<[boolean]>(jacdac.CompassReg.Enabled, "u8");
            this._headingError = this.addRegister<[number]>(jacdac.CompassReg.HeadingError, "u16.16");            
        }
    

        /**
        * The heading with respect to the magnetic north.
        */
        //% callInDebugger
        //% group="Compass"
        //% block="%compass heading"
        //% blockId=jacdac_compass_heading___get
        //% weight=100
        heading(): number {
            return this.reading();
        
        }

        /**
        * Turn on or off the sensor. Turning on the sensor may start a calibration sequence.
        */
        //% callInDebugger
        //% group="Compass"
        //% block="%compass enabled"
        //% blockId=jacdac_compass_enabled___get
        //% weight=99
        enabled(): boolean {
            this.start();            
            const values = this._enabled.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * Turn on or off the sensor. Turning on the sensor may start a calibration sequence.
        */
        //% group="Compass"
        //% blockId=jacdac_compass_enabled___set
        //% block="set %compass %value=toggleOnOff"
        //% weight=98
        setEnabled(value: boolean) {
            this.start();
            const values = this._enabled.values as any[];
            values[0] = value ? 1 : 0;
            this._enabled.values = values as [boolean];
        }

        /**
        * Error on the heading reading
        */
        //% callInDebugger
        //% group="Compass"
        //% weight=97
        headingError(): number {
            this.start();            
            const values = this._headingError.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Run code when the heading changes by the given threshold value.
        */
        //% group="Compass"
        //% blockId=jacdac_compass_on_heading_change
        //% block="on %compass heading changed by %threshold"
        //% weight=96
        //% threshold.defl=1
        onHeadingChangedBy(threshold: number, handler: () => void): void {
            this.onReadingChangedBy(threshold, handler);
        }


        /**
        * Starts a calibration sequence for the compass.
        */
        //% group="Compass"
        //% blockId=jacdac_compass_calibrate_cmd
        //% block="%compass calibrate"
        //% weight=95
        calibrate(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.CompassCmd.Calibrate))
        }
    
    }
    //% fixedInstance whenUsed
    export const compass = new CompassClient("compass");
}
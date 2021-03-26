namespace modules {
    /**
     * Controls a mini traffic with a red, orange and green LED.
     **/
    //% fixedInstances blockGap=8
    export class TrafficLightClient extends jacdac.Client {

        private readonly _red : jacdac.RegisterClient<[boolean]>;
        private readonly _orange : jacdac.RegisterClient<[boolean]>;
        private readonly _green : jacdac.RegisterClient<[boolean]>;            

        constructor(role: string) {
            super(jacdac.SRV_TRAFFIC_LIGHT, role);

            this._red = this.addRegister<[boolean]>(jacdac.TrafficLightReg.Red, "u8");
            this._orange = this.addRegister<[boolean]>(jacdac.TrafficLightReg.Orange, "u8");
            this._green = this.addRegister<[boolean]>(jacdac.TrafficLightReg.Green, "u8");            
        }
    

        /**
        * The on/off state of the red light.
        */
        //% callInDebugger
        //% group="Traffic Light"
        //% weight=100
        red(): boolean {
            this.start();            
            const values = this._red.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * The on/off state of the red light.
        */
        //% group="Traffic Light"
        //% weight=99
        setRed(value: boolean) {
            this.start();
            const values = this._red.values as any[];
            values[0] = value ? 1 : 0;
            this._red.values = values as [boolean];
        }

        /**
        * The on/off state of the red light.
        */
        //% callInDebugger
        //% group="Traffic Light"
        //% weight=98
        orange(): boolean {
            this.start();            
            const values = this._orange.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * The on/off state of the red light.
        */
        //% group="Traffic Light"
        //% weight=97
        setOrange(value: boolean) {
            this.start();
            const values = this._orange.values as any[];
            values[0] = value ? 1 : 0;
            this._orange.values = values as [boolean];
        }

        /**
        * The on/off state of the red light.
        */
        //% callInDebugger
        //% group="Traffic Light"
        //% weight=96
        green(): boolean {
            this.start();            
            const values = this._green.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * The on/off state of the red light.
        */
        //% group="Traffic Light"
        //% weight=95
        setGreen(value: boolean) {
            this.start();
            const values = this._green.values as any[];
            values[0] = value ? 1 : 0;
            this._green.values = values as [boolean];
        }

    
    }
    //% fixedInstance whenUsed
    export const trafficLight = new TrafficLightClient("traffic Light");
}
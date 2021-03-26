namespace modules {
    /**
     * A service that can send DMX512-A packets with limited size. This service is designed to allow tinkering with a few DMX devices, but only allows 235 channels. More about DMX at https://en.wikipedia.org/wiki/DMX512.
     **/
    //% fixedInstances blockGap=8
    export class DmxClient extends jacdac.Client {

        private readonly _enabled : jacdac.RegisterClient<[boolean]>;            

        constructor(role: string) {
            super(jacdac.SRV_DMX, role);

            this._enabled = this.addRegister<[boolean]>(jacdac.DmxReg.Enabled, "u8");            
        }
    

        /**
        * Determines if the DMX bridge is active
        */
        //% callInDebugger
        //% group="DMX"
        //% block="%dmx enabled"
        //% blockId=jacdac_dmx_enabled___get
        //% weight=100
        enabled(): boolean {
            this.start();            
            const values = this._enabled.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * Determines if the DMX bridge is active
        */
        //% group="DMX"
        //% blockId=jacdac_dmx_enabled___set
        //% block="set %dmx %value=toggleOnOff"
        //% weight=99
        setEnabled(value: boolean) {
            this.start();
            const values = this._enabled.values as any[];
            values[0] = value ? 1 : 0;
            this._enabled.values = values as [boolean];
        }


        /**
        * Send a DMX packet, up to 236bytes long, including the start code.
        */
        //% group="DMX"
        //% blockId=jacdac_dmx_send_cmd
        //% block="%dmx send"
        //% weight=98
        send(channels: Buffer): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.DmxCmd.Send, "b", [channels]))
        }
    
    }
    //% fixedInstance whenUsed
    export const dmx = new DmxClient("dmx");
}
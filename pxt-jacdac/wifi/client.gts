namespace modules {
    /**
     * Discovery and connection to WiFi networks. Separate TCP service is used for data transfer.
     **/
    //% fixedInstances blockGap=8
    export class WifiClient extends jacdac.Client {

        private readonly _connected : jacdac.RegisterClient<[boolean]>;            

        constructor(role: string) {
            super(jacdac.SRV_WIFI, role);

            this._connected = this.addRegister<[boolean]>(jacdac.WifiReg.Connected, "u8");            
        }
    

        /**
        * Indicates whether or not we currently have an IP address assigned.
        */
        //% callInDebugger
        //% group="Iot"
        //% weight=100
        connected(): boolean {
            this.start();            
            const values = this._connected.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
         * Emitted upon successful join and IP address assignment.
         */
        //% group="Iot"
        //% blockId=jacdac_on_wifi_got_ip
        //% block="on %wifi got ip"
        //% weight=99
        onGotIp(handler: () => void): void {
            this.registerEvent(jacdac.WifiEvent.GotIp, handler);
        }
        /**
         * Emitted when disconnected from network.
         */
        //% group="Iot"
        //% blockId=jacdac_on_wifi_lost_ip
        //% block="on %wifi lost ip"
        //% weight=98
        onLostIp(handler: () => void): void {
            this.registerEvent(jacdac.WifiEvent.LostIp, handler);
        }

        /**
        * Connect to named network.
        */
        //% group="Iot"
        //% blockId=jacdac_wifi_connect_cmd
        //% block="%wifi connect"
        //% weight=97
        connect(ssid: string, password: string): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.WifiCmd.Connect, "z z", [ssid, password]))
        }

        /**
        * Disconnect from current WiFi network if any.
        */
        //% group="Iot"
        //% blockId=jacdac_wifi_disconnect_cmd
        //% block="%wifi disconnect"
        //% weight=96
        disconnect(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.WifiCmd.Disconnect))
        }
    
    }
    //% fixedInstance whenUsed block="wifi 1"
    export const wifi1 = new WifiClient("wifi1");
}
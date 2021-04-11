namespace modules {
    /**
     * Send messages, receive commands, and work with device twins in Azure IoT Hub.
     **/
    //% fixedInstances blockGap=8
    export class IotHubClient extends jacdac.Client {

        private readonly _connectionStatus : jacdac.RegisterClient<[string]>;
        private readonly _connectionString : jacdac.RegisterClient<[string]>;
        private readonly _hubName : jacdac.RegisterClient<[string]>;
        private readonly _deviceId : jacdac.RegisterClient<[string]>;            

        constructor(role: string) {
            super(jacdac.SRV_IOT_HUB, role);

            this._connectionStatus = this.addRegister<[string]>(jacdac.IotHubReg.ConnectionStatus, "s");
            this._connectionString = this.addRegister<[string]>(jacdac.IotHubReg.ConnectionString, "s");
            this._hubName = this.addRegister<[string]>(jacdac.IotHubReg.HubName, "s");
            this._deviceId = this.addRegister<[string]>(jacdac.IotHubReg.DeviceId, "s");            
        }
    

        /**
        * Returns `"ok"` when connected, and an error description otherwise.
        */
        //% callInDebugger
        //% group="Iot"
        //% weight=100
        connectionStatus(): string {
            this.start();            
            const values = this._connectionStatus.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Connection string typically looks something like 
        * `HostName=my-iot-hub.azure-devices.net;DeviceId=my-dev-007;SharedAccessKey=xyz+base64key`.
        * You can get it in `Shared access policies -> iothubowner -> Connection string-primary key` in the Azure Portal.
        * This register is write-only.
        * You can use `hub_name` and `device_id` to check if connection string is set, but you cannot get the shared access key.
        */
        //% callInDebugger
        //% group="Iot"
        //% weight=99
        connectionString(): string {
            this.start();            
            const values = this._connectionString.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Connection string typically looks something like 
        * `HostName=my-iot-hub.azure-devices.net;DeviceId=my-dev-007;SharedAccessKey=xyz+base64key`.
        * You can get it in `Shared access policies -> iothubowner -> Connection string-primary key` in the Azure Portal.
        * This register is write-only.
        * You can use `hub_name` and `device_id` to check if connection string is set, but you cannot get the shared access key.
        */
        //% group="Iot"
        //% weight=98
        setConnectionString(value: string) {
            this.start();
            const values = this._connectionString.values as any[];
            values[0] = value;
            this._connectionString.values = values as [string];
        }

        /**
        * Something like `my-iot-hub.azure-devices.net`; empty string when `connection_string` is not set.
        */
        //% callInDebugger
        //% group="Iot"
        //% weight=97
        hubName(): string {
            this.start();            
            const values = this._hubName.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Something like `my-dev-007`; empty string when `connection_string` is not set.
        */
        //% callInDebugger
        //% group="Iot"
        //% weight=96
        deviceId(): string {
            this.start();            
            const values = this._deviceId.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Emitted upon successful connection.
         */
        //% group="Iot"
        //% blockId=jacdac_on_iothub_connected
        //% block="on %iothub connected"
        //% weight=95
        onConnected(handler: () => void): void {
            this.registerEvent(jacdac.IotHubEvent.Connected, handler);
        }
        /**
         * Emitted when connection was lost.
         */
        //% group="Iot"
        //% blockId=jacdac_on_iothub_connection_error
        //% block="on %iothub connection error"
        //% weight=94
        onConnectionError(handler: () => void): void {
            this.registerEvent(jacdac.IotHubEvent.ConnectionError, handler);
        }
        /**
         * This event is emitted upon reception of a cloud to device message, that is a string
        * (doesn't contain NUL bytes) and fits in a single event packet.
        * For reliable reception, use the `subscribe` command above.
         */
        //% group="Iot"
        //% blockId=jacdac_on_iothub_devicebound_str
        //% block="on %iothub devicebound str"
        //% weight=93
        onDeviceboundStr(handler: () => void): void {
            this.registerEvent(jacdac.IotHubEvent.DeviceboundStr, handler);
        }

        /**
        * Try connecting using currently set `connection_string`.
        * The service normally preiodically tries to connect automatically.
        */
        //% group="Iot"
        //% blockId=jacdac_iothub_connect_cmd
        //% block="%iothub connect"
        //% weight=92
        connect(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.IotHubCmd.Connect))
        }

        /**
        * Disconnect from current Hub if any.
        * This disables auto-connect behavior, until a `connect` command is issued.
        */
        //% group="Iot"
        //% blockId=jacdac_iothub_disconnect_cmd
        //% block="%iothub disconnect"
        //% weight=91
        disconnect(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.IotHubCmd.Disconnect))
        }

        /**
        * Sends a short message in string format (it's typically JSON-encoded). Multiple properties can be attached.
        */
        //% group="Iot"
        //% blockId=jacdac_iothub_send_string_msg_cmd
        //% block="%iothub send string msg"
        //% weight=90
        sendStringMsg(msg: string, propertyName: ([string, string])[], propertyValue: undefined): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.IotHubCmd.SendStringMsg, "z r: z z", [msg, propertyName, propertyValue]))
        }

        /**
        * Sends an arbitrary, possibly binary, message. The size is only limited by RAM on the module.
        */
        //% group="Iot"
        //% blockId=jacdac_iothub_send_msg_ext_cmd
        //% block="%iothub send msg ext"
        //% weight=89
        sendMsgExt(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.IotHubCmd.SendMsgExt))
        }

        /**
        * Start twin update.
        */
        //% group="Iot"
        //% blockId=jacdac_iothub_patch_twin_cmd
        //% block="%iothub patch twin"
        //% weight=88
        patchTwin(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.IotHubCmd.PatchTwin))
        }

        /**
        * Respond to a direct method call (`request_id` comes from `subscribe_method` pipe).
        */
        //% group="Iot"
        //% blockId=jacdac_iothub_respond_to_method_cmd
        //% block="%iothub respond to method"
        //% weight=87
        respondToMethod(status: number, requestId: string): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.IotHubCmd.RespondToMethod, "u32 z", [status, requestId]))
        }
    
    }
    //% fixedInstance whenUsed block="iot hub 1"
    export const iotHub1 = new IotHubClient("iot Hub1");
}
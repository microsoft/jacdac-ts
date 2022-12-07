/* eslint-disable @typescript-eslint/no-unused-vars */
import { Setting } from "../jdom/setting"
import {
    CloudConfigurationCmd,
    CloudConfigurationConnectionStatus,
    CloudConfigurationEvent,
    CloudConfigurationReg,
    CHANGE,
    CONNECT,
    DISCONNECT,
    SRV_CLOUD_CONFIGURATION,
} from "../jdom/constants"
import { Packet } from "../jdom/packet"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer, JDServerOptions } from "../jdom/servers/serviceserver"
import { delay } from "../jdom/utils"

function splitPair(kv: string): string[] {
    const i = kv.indexOf("=")
    if (i < 0) return [kv, ""]
    else return [kv.slice(0, i), kv.slice(i + 1)]
}

function parsePropertyBag(
    msg: string,
    separator?: string
): Record<string, string> {
    const r: Record<string, string> = {}
    msg.split(separator || "&")
        .map(kv => splitPair(kv))
        .forEach(
            parts =>
                (r[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]))
        )
    return r
}

export class AzureIoTHubConfigurationServer extends JDServiceServer {
    readonly hubName: JDRegisterServer<[string]>
    readonly cloudDeviceId: JDRegisterServer<[string]>
    readonly cloudType: JDRegisterServer<[string]>
    readonly connectionStatus: JDRegisterServer<
        [CloudConfigurationConnectionStatus]
    >
    connectionString: string
    isReal = false

    constructor(
        options?: JDServerOptions,
        readonly connStringSetting?: Setting
    ) {
        super(SRV_CLOUD_CONFIGURATION, options)

        this.hubName = this.addRegister(CloudConfigurationReg.HubName, [""])
        this.cloudDeviceId = this.addRegister(
            CloudConfigurationReg.CloudDeviceId,
            [""]
        )
        this.cloudType = this.addRegister(CloudConfigurationReg.CloudType, [
            "Azure IoT Hub",
        ])
        this.connectionStatus = this.addRegister(
            CloudConfigurationReg.ConnectionStatus,
            [CloudConfigurationConnectionStatus.Disconnected]
        )
        this.connectionStatus.on(CHANGE, () =>
            this.sendEvent(CloudConfigurationEvent.ConnectionStatusChange)
        )
        this.connectionString = this.connStringSetting?.get() || ""

        this.addCommand(
            CloudConfigurationCmd.Connect,
            this.handleConnect.bind(this)
        )
        this.addCommand(
            CloudConfigurationCmd.Disconnect,
            this.handleDisconnect.bind(this)
        )
        this.addCommand(
            CloudConfigurationCmd.SetConnectionString,
            this.handleSetConnectionString.bind(this)
        )
    }

    parsedConnectionString() {
        return parsePropertyBag(this.connectionString || "", ";")
    }

    setConnectionStatus(status: CloudConfigurationConnectionStatus) {
        this.connectionStatus.setValues([status])
    }

    async setConnectionString(newConnectionString: string) {
        console.log("set connX: " + newConnectionString)
        if (newConnectionString !== this.connectionString) {
            await this.handleDisconnect()
            this.connectionString = newConnectionString
            this.connStringSetting?.set(newConnectionString)
            const connStringParts = parsePropertyBag(this.connectionString, ";")
            this.hubName.setValues([connStringParts["HostName"] || ""])
            this.cloudDeviceId.setValues([connStringParts["DeviceId"] || ""])
            // notify connection string changed
            this.sendEvent(CloudConfigurationEvent.ConnectionStatusChange)
            this.emit(CHANGE)
            await this.handleConnect()
        }
    }

    private async handleConnect() {
        if (!this.connectionString) {
            this.setConnectionStatus(401)
            return
        }

        this.setConnectionStatus(CloudConfigurationConnectionStatus.Connecting)

        if (this.isReal) {
            this.emit(CONNECT, this.connectionString)
        } else {
            await delay(500)
            this.setConnectionStatus(
                CloudConfigurationConnectionStatus.Connected
            )
        }
    }

    private async handleDisconnect() {
        this.setConnectionStatus(
            CloudConfigurationConnectionStatus.Disconnecting
        )
        if (this.isReal) {
            this.emit(DISCONNECT)
        } else {
            await delay(500)
            this.setConnectionStatus(
                CloudConfigurationConnectionStatus.Disconnected
            )
        }
    }

    private async handleSetConnectionString(pkt: Packet) {
        await this.setConnectionString(pkt.stringData)
    }
}

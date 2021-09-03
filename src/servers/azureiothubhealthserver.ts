/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    AzureIotHubHealthCmd,
    AzureIotHubHealthConnectionStatus,
    AzureIotHubHealthEvent,
    AzureIotHubHealthReg,
    CHANGE,
    SRV_AZURE_IOT_HUB_HEALTH,
} from "../jdom/constants"
import Packet from "../jdom/packet"
import JDRegisterServer from "../jdom/servers/registerserver"
import JDServiceServer, { ServerOptions } from "../jdom/servers/serviceserver"
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

export default class AzureIoTHubHealthServer extends JDServiceServer {
    readonly hubName: JDRegisterServer<[string]>
    readonly hubDeviceId: JDRegisterServer<[string]>
    readonly connectionStatus: JDRegisterServer<
        [AzureIotHubHealthConnectionStatus]
    >
    connectionString: string

    constructor(options?: ServerOptions) {
        super(SRV_AZURE_IOT_HUB_HEALTH, options)

        this.hubName = this.addRegister(AzureIotHubHealthReg.HubName, [""])
        this.hubDeviceId = this.addRegister(AzureIotHubHealthReg.HubDeviceId, [
            "",
        ])
        this.connectionStatus = this.addRegister(
            AzureIotHubHealthReg.ConnectionStatus,
            [AzureIotHubHealthConnectionStatus.Connected]
        )
        this.connectionStatus.on(CHANGE, () =>
            this.sendEvent(AzureIotHubHealthEvent.ConnectionStatusChange)
        )
        this.connectionString = ""

        this.addCommand(
            AzureIotHubHealthCmd.Connect,
            this.handleConnect.bind(this)
        )
        this.addCommand(
            AzureIotHubHealthCmd.Disconnect,
            this.handleDisconnect.bind(this)
        )
        this.addCommand(
            AzureIotHubHealthCmd.SetConnectionString,
            this.handleSetConnectionString.bind(this)
        )
    }

    private async handleConnect() {
        this.connectionStatus.setValues([
            AzureIotHubHealthConnectionStatus.Connecting,
        ])
        await delay(500)
        if (!this.connectionString) this.connectionStatus.setValues([401])
        else
            this.connectionStatus.setValues([
                AzureIotHubHealthConnectionStatus.Connected,
            ])
    }

    private async handleDisconnect() {
        this.connectionStatus.setValues([
            AzureIotHubHealthConnectionStatus.Disconnecting,
        ])
        await delay(500)
        this.connectionStatus.setValues([
            AzureIotHubHealthConnectionStatus.Disconnected,
        ])
    }

    private async handleSetConnectionString(pkt: Packet) {
        const newConnectionString = pkt.stringData
        if (newConnectionString !== this.connectionString) {
            await this.handleDisconnect()
            this.connectionString = newConnectionString
            const connStringParts = parsePropertyBag(this.connectionString, ";")
            this.hubName.setValues([connStringParts["HostName"] || ""])
            this.hubDeviceId.setValues([connStringParts["DeviceId"] || ""])
            // notify connection string changed
            this.sendEvent(AzureIotHubHealthEvent.ConnectionStatusChange)
        }
    }
}

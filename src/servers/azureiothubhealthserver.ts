/* eslint-disable @typescript-eslint/no-unused-vars */
import { Setting } from "../jdom/setting"
import {
    AzureIotHubHealthCmd,
    AzureIotHubHealthConnectionStatus,
    AzureIotHubHealthEvent,
    AzureIotHubHealthReg,
    CHANGE,
    CONNECT,
    DISCONNECT,
    SRV_AZURE_IOT_HUB_HEALTH,
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

export class AzureIoTHubHealthServer extends JDServiceServer {
    readonly hubName: JDRegisterServer<[string]>
    readonly hubDeviceId: JDRegisterServer<[string]>
    readonly connectionStatus: JDRegisterServer<
        [AzureIotHubHealthConnectionStatus]
    >
    connectionString: string
    isReal = false

    constructor(
        options?: JDServerOptions,
        readonly connStringSetting?: Setting
    ) {
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
        this.connectionString = this.connStringSetting?.get() || ""

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

    parsedConnectionString() {
        return parsePropertyBag(this.connectionString || "", ";")
    }

    setConnectionStatus(status: AzureIotHubHealthConnectionStatus) {
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
            this.hubDeviceId.setValues([connStringParts["DeviceId"] || ""])
            // notify connection string changed
            this.sendEvent(AzureIotHubHealthEvent.ConnectionStatusChange)
            this.emit(CHANGE)
            await this.handleConnect()
        }
    }

    private async handleConnect() {
        if (!this.connectionString) {
            this.setConnectionStatus(401)
            return
        }

        this.setConnectionStatus(AzureIotHubHealthConnectionStatus.Connecting)

        if (this.isReal) {
            this.emit(CONNECT, this.connectionString)
        } else {
            await delay(500)
            this.setConnectionStatus(
                AzureIotHubHealthConnectionStatus.Connected
            )
        }
    }

    private async handleDisconnect() {
        this.setConnectionStatus(
            AzureIotHubHealthConnectionStatus.Disconnecting
        )
        if (this.isReal) {
            this.emit(DISCONNECT)
        } else {
            await delay(500)
            this.setConnectionStatus(
                AzureIotHubHealthConnectionStatus.Disconnected
            )
        }
    }

    private async handleSetConnectionString(pkt: Packet) {
        await this.setConnectionString(pkt.stringData)
    }
}

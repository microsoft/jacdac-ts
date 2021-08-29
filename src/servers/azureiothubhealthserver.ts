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
import JDRegisterServer from "../jdom/registerserver"
import JDServiceServer, { ServerOptions } from "../jdom/serviceserver"
import { delay } from "../jdom/utils"

/**
 * Server creation options for the Azure IoT hub message
 * @category Servers
 * @internal
 */
export interface AzureIoTHubServerOptions extends ServerOptions {
    hubName?: string
}

export default class AzureIoTHubHealthServer extends JDServiceServer {
    readonly hubName: JDRegisterServer<[string]>
    readonly connectionStatus: JDRegisterServer<
        [AzureIotHubHealthConnectionStatus]
    >
    readonly statistics: JDRegisterServer<[number, number, number, number]>
    connectionString: string

    constructor(options?: AzureIoTHubServerOptions) {
        super(SRV_AZURE_IOT_HUB_HEALTH, options)
        const { hubName = "myhub" } = options || {}

        this.hubName = this.addRegister(AzureIotHubHealthReg.HubName, [hubName])
        this.connectionStatus = this.addRegister(
            AzureIotHubHealthReg.ConnectionStatus,
            [AzureIotHubHealthConnectionStatus.Connected]
        )
        this.connectionStatus.on(CHANGE, () =>
            this.sendEvent(AzureIotHubHealthEvent.ConnectionStatusChange)
        )
        this.statistics = this.addRegister(AzureIotHubHealthReg.Statistics)
        this.connectionString = ""

        this.addCommand(AzureIotHubHealthCmd.Ping, this.handlePing.bind(this))
        this.addCommand(
            AzureIotHubHealthCmd.Connect,
            this.handleConnect.bind(this)
        )
        this.addCommand(
            AzureIotHubHealthCmd.Disconnect,
            this.handleDisconnect.bind(this)
        )
    }

    private async handleConnect(pkt: Packet) {
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

    private async handleDisconnect(pkt: Packet) {
        this.connectionStatus.setValues([
            AzureIotHubHealthConnectionStatus.Disconnecting,
        ])
        await delay(500)
        this.connectionStatus.setValues([
            AzureIotHubHealthConnectionStatus.Disconnected,
        ])
    }

    private handlePing(pkt: Packet) {}

    private handleSetConnectionString(pkt: Packet) {}
}

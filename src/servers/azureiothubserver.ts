import {
    AzureIotHubCmd,
    AzureIotHubEvent,
    AzureIotHubReg,
    CHANGE,
    SRV_AZURE_IOT_HUB,
} from "../jdom/constants"
import JDServiceServer, { ServerOptions } from "../jdom/serviceserver"
import RegisterServer from "../jdom/registerserver"
import Packet from "../jdom/packet"

export interface AzureIoTHubServerOptions extends ServerOptions {
    hubName?: string
    deviceId?: string
}

export class AzureIoTMessage {
    timestamp: number
    body: string
}

export default class AzureIoTHubServer extends JDServiceServer {
    readonly hubName: RegisterServer<[string]>
    readonly deviceId: RegisterServer<[string]>
    readonly connectionStatus: RegisterServer<[string]>

    maxMessages = 10
    readonly messages: AzureIoTMessage[] = []

    constructor(options?: AzureIoTHubServerOptions) {
        super(SRV_AZURE_IOT_HUB, options)
        const { hubName = "myhub", deviceId = "mydevice" } = options || {}

        this.hubName = this.addRegister<[string]>(AzureIotHubReg.HubName, [
            hubName,
        ])
        this.deviceId = this.addRegister<[string]>(AzureIotHubReg.DeviceId, [
            deviceId,
        ])
        this.connectionStatus = this.addRegister<[string]>(
            AzureIotHubReg.ConnectionStatus,
            [""]
        )

        this.addCommand(
            AzureIotHubCmd.SendMessage,
            this.handleSendMessage.bind(this)
        )
        this.addCommand(AzureIotHubCmd.Connect, this.handleConnect.bind(this))
        this.addCommand(
            AzureIotHubCmd.Disconnect,
            this.handleDisconnect.bind(this)
        )

        // send change event when status changes
        this.connectionStatus.on(CHANGE, () =>
            this.sendEvent(AzureIotHubEvent.Change)
        )
    }

    async handleConnect() {
        this.connectionStatus.setValues(["ok"])
    }

    handleDisconnect() {
        this.connectionStatus.setValues([""])
    }

    handleSendMessage(pkt: Packet) {
        const [state] = this.connectionStatus.values()
        if (state === "ok") {
            const [body] = pkt.jdunpack<[string]>("s")
            this.messages.unshift({
                timestamp: this.device.bus.timestamp,
                body,
            })
            while (this.messages.length > this.maxMessages) this.messages.pop()
            this.emit(CHANGE)
        }
        // todo send report
    }
}

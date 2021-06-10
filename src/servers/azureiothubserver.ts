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
import { jdpack } from "../jdom/pack"

export interface AzureIoTHubServerOptions extends ServerOptions {
    hubName?: string
    deviceId?: string
}

export class AzureIoTHubMessage {
    timestamp: number
    body: string
}

export default class AzureIoTHubServer extends JDServiceServer {
    readonly hubName: RegisterServer<[string]>
    readonly deviceId: RegisterServer<[string]>
    readonly connectionStatus: RegisterServer<[string]>

    maxMessages = 10
    readonly deviceToCloudMessages: AzureIoTHubMessage[] = []
    readonly cloudToDeviceMessages: AzureIoTHubMessage[] = []
    autoConnect = true

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
        this.addCommand(AzureIotHubCmd.Connect, this.connect.bind(this))
        this.addCommand(AzureIotHubCmd.Disconnect, this.disconnect.bind(this))

        // send change event when status changes
        this.connectionStatus.on(CHANGE, () => {
            const [status] = this.connectionStatus.values()
            if (status === "ok") this.sendEvent(AzureIotHubEvent.Connected)
            else this.sendEvent(AzureIotHubEvent.Disconnected)
        })
    }

    get connected() {
        const [state] = this.connectionStatus.values()
        return state === "ok"
    }

    connect() {
        this.autoConnect = true
        this.connectionStatus.setValues(["ok"])
    }

    disconnect() {
        this.autoConnect = false
        this.connectionStatus.setValues([""])
    }

    emitMessage(body: string) {
        if (!this.connected) {
            if (this.autoConnect) this.connect()
            if (!this.connected) return
        }

        this.cloudToDeviceMessages.unshift({
            timestamp: this.device.bus.timestamp,
            body,
        })
        while (this.cloudToDeviceMessages.length > this.maxMessages)
            this.cloudToDeviceMessages.pop()
        this.emit(CHANGE)
        this.sendEvent(AzureIotHubEvent.Message, jdpack<[string]>("s", [body]))
    }

    handleSendMessage(pkt: Packet) {
        if (!this.connected) {
            if (this.autoConnect) this.connect()
            if (!this.connected) return
        }

        const [body] = pkt.jdunpack<[string]>("s")
        this.deviceToCloudMessages.unshift({
            timestamp: this.device.bus.timestamp,
            body,
        })
        while (this.deviceToCloudMessages.length > this.maxMessages)
            this.deviceToCloudMessages.pop()
        this.emit(CHANGE)
        // todo send report
    }
}

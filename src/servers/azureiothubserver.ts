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

export interface AzureIoTTransport {
    connect: () => Promise<void>
    disconnect: () => Promise<void>
    sendMessage: (pkt: Packet) => void
}

/**
 * Server creation options for the Azure IoT hub message
 * @category Servers
 * @internal
 */
export interface AzureIoTHubServerOptions extends ServerOptions {
    hubName?: string
    deviceId?: string
    transport?: AzureIoTTransport
}

/**
 * A Azure IoT hub message
 * @category Servers
 * @internal
 */
export interface AzureIoTHubMessage {
    counter: number
    timestamp: number
    body: string
}

/**
 * A server implementation of the bit:radio service
 * @category Servers
 */
export default class AzureIoTHubServer extends JDServiceServer {
    readonly hubName: RegisterServer<[string]>
    readonly deviceId: RegisterServer<[string]>
    readonly connectionStatus: RegisterServer<[string]>
    readonly transport: AzureIoTTransport

    maxMessages = 10
    readonly deviceToCloudMessages: AzureIoTHubMessage[] = []
    readonly cloudToDeviceMessages: AzureIoTHubMessage[] = []
    autoConnect = true
    private cdCounter = 0
    private dcCounter = 0

    constructor(options?: AzureIoTHubServerOptions) {
        super(SRV_AZURE_IOT_HUB, options)
        const { hubName = "myhub", deviceId = "mydevice" } = options || {}
        this.transport = options?.transport
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

    async connect() {
        await this.transport?.connect()
        this.autoConnect = true
        this.connectionStatus.setValues(["ok"])
    }

    async disconnect() {
        await this.transport?.disconnect()
        this.autoConnect = false
        this.connectionStatus.setValues([""])
    }

    async emitMessage(body: string) {
        if (!this.connected) {
            if (this.autoConnect) await this.connect()
            if (!this.connected) return
        }

        this.cloudToDeviceMessages.unshift({
            counter: this.cdCounter++,
            timestamp: this.device.bus.timestamp,
            body,
        })
        while (this.cloudToDeviceMessages.length > this.maxMessages)
            this.cloudToDeviceMessages.pop()
        this.emit(CHANGE)
        this.sendEvent(AzureIotHubEvent.Message, jdpack<[string]>("s", [body]))
    }

    async handleSendMessage(pkt: Packet) {
        if (!this.connected) {
            if (this.autoConnect) await this.connect()
            if (!this.connected) return
        }

        const [body] = pkt.jdunpack<[string]>("s")
        this.deviceToCloudMessages.unshift({
            counter: this.dcCounter++,
            timestamp: this.device.bus.timestamp,
            body,
        })
        while (this.deviceToCloudMessages.length > this.maxMessages)
            this.deviceToCloudMessages.pop()
        this.emit(CHANGE)
        this.transport?.sendMessage(pkt)
    }
}

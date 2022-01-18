/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    CHANGE,
    Packet,
    JDRegisterServer,
    JDServiceServer,
    JDServerOptions,
    SRV_JACSCRIPT_CLOUD,
    JacscriptCloudReg,
    JacscriptCloudCmd,
    CONNECT,
    DISCONNECT,
} from "jacdac-ts"
import { AzureIoTHubConnector } from "./azureiothubconnector"

export class JacscriptCloudServer extends JDServiceServer {
    readonly connected: JDRegisterServer<[boolean]>

    constructor(
        public connector: AzureIoTHubConnector,
        options?: JDServerOptions
    ) {
        super(SRV_JACSCRIPT_CLOUD, options)

        this.connected = this.addRegister(JacscriptCloudReg.Connected, [false])
        this.connected.on(CHANGE, () => {
            // this.sendEvent(AzureIotHubHealthEvent.ConnectionStatusChange)
        })

        this.connector.on(CONNECT, () => this.connected.setValues([true]))
        this.connector.on(DISCONNECT, () => this.connected.setValues([false]))

        this.addCommand(JacscriptCloudCmd.Upload, this.handleUpload.bind(this))
        this.addCommand(
            JacscriptCloudCmd.AckCloudCommand,
            this.handleAckCloudCommand.bind(this)
        )
        this.addCommand(
            JacscriptCloudCmd.GetTwin,
            this.handleGetTwin.bind(this)
        )
        this.addCommand(
            JacscriptCloudCmd.SubscribeTwin,
            this.handleSubscribeTwin.bind(this)
        )
    }

    private async handleUpload(pkt: Packet) {
        const [label, values] = pkt.jdunpack<[string, number[]]>("z f64[]")
        this.connector.upload(label, values)
    }

    private async handleAckCloudCommand(pkt: Packet) {
        // TODO
    }

    private async handleGetTwin(pkt: Packet) {
        // TODO
    }

    private async handleSubscribeTwin(pkt: Packet) {
        // TODO
    }
}

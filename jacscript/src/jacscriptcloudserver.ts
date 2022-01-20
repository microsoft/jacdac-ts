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
    JacscriptCloudEvent,
    jdpack,
} from "jacdac-ts"
import { AzureIoTHubConnector, MethodInvocation } from "./azureiothubconnector"

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
        this.connector.on("method", this.handleMethod.bind(this))

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

    private async handleMethod(info: MethodInvocation) {
        console.log("invoke", info)
        const args: number[] = Array.isArray(info.payload)
            ? info.payload
            : info.payload?.args || []
        const payload = jdpack<[number, string, number[]]>("u32 z f64[]", [
            info.seqNo,
            info.method,
            args,
        ])
        await this.sendEvent(JacscriptCloudEvent.CloudCommand, payload)
    }

    private async handleUpload(pkt: Packet) {
        const [label, values] = pkt.jdunpack<[string, number[]]>("z f64[]")
        console.log("upload", label, values)
        this.connector.upload(label, values)
    }

    private async handleAckCloudCommand(pkt: Packet) {
        const [seqNo, args] = pkt.jdunpack<[number, number[]]>("u32 f64[]")
        console.log("ack-invoke", seqNo, args)
        this.connector.finishMethod(seqNo, { args })
    }

    private async handleGetTwin(pkt: Packet) {
        // TODO
    }

    private async handleSubscribeTwin(pkt: Packet) {
        // TODO
    }
}

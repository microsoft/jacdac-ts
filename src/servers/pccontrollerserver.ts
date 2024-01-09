import { PCControllerCmd, SRV_PCCONTROLLER } from "../jdom/constants"
import { Packet } from "../jdom/packet"
import { JDServerOptions, JDServiceServer } from "../jdom/servers/serviceserver"

export class PCControllerServer extends JDServiceServer {
    constructor(options?: JDServerOptions) {
        super(SRV_PCCONTROLLER, options)

        this.addCommand(PCControllerCmd.OpenUrl, this.handleOpenUrl.bind(this))
        this.addCommand(
            PCControllerCmd.SendText,
            this.handleSendText.bind(this),
        )
        this.addCommand(
            PCControllerCmd.StartApp,
            this.handleStartApp.bind(this),
        )
        this.addCommand(
            PCControllerCmd.RunScript,
            this.handleRunScript.bind(this),
        )
    }

    public static readonly OPEN_URL = "openUrl"
    public static readonly SEND_TEXT = "sendText"
    public static readonly START_APP = "startApp"
    public static readonly RUN_SCRIPT = "runScript"

    private handleOpenUrl(pkt: Packet) {
        const url = pkt.stringData
        this.emit(PCControllerServer.OPEN_URL, url)
    }

    private handleSendText(pkt: Packet) {
        const text = pkt.stringData
        this.emit(PCControllerServer.SEND_TEXT, text)
    }

    private handleStartApp(pkt: Packet) {
        const text = pkt.stringData
        this.emit(PCControllerServer.START_APP, text)
    }

    private handleRunScript(pkt: Packet) {
        const text = pkt.stringData
        this.emit(PCControllerServer.RUN_SCRIPT, text)
    }
}

import {
    JacscriptManagerCmd,
    JacscriptManagerReg,
    SRV_JACSCRIPT_MANAGER,
} from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer } from "../jdom/servers/serviceserver"

export class JacscriptManagerServer extends JDServiceServer {
    readonly running: JDRegisterServer<[boolean]>
    readonly autoStart: JDRegisterServer<[boolean]>
    readonly logging: JDRegisterServer<[boolean]>

    private bytecode: Uint8Array

    constructor() {
        super(SRV_JACSCRIPT_MANAGER)

        this.running = this.addRegister(JacscriptManagerReg.Running, [false])
        this.autoStart = this.addRegister(JacscriptManagerReg.Running, [true])
        this.logging = this.addRegister(JacscriptManagerReg.Logging, [true])

        this.addCommand(
            JacscriptManagerCmd.DeployBytecode,
            this.handleDeployBytecode.bind(this)
        )
        this.addCommand(
            JacscriptManagerCmd.ReadBytecode,
            this.handleReadByteCode.bind(this)
        )
    }

    private handleDeployBytecode(pkt: Packet) {
        // read bytes
    }

    private async handleReadByteCode(pkt: Packet) {
        // todo
    }
}

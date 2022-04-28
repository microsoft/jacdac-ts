import { fnv1 } from "../jdom/utils"
import {
    CHANGE,
    JacscriptManagerCmd,
    JacscriptManagerEvent,
    JacscriptManagerReg,
    SRV_JACSCRIPT_MANAGER,
} from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer } from "../jdom/servers/serviceserver"
import { OutPipe } from "../jdom/pipes"
import { Packet } from "../jdom/packet"

export class JacscriptManagerServer extends JDServiceServer {
    readonly running: JDRegisterServer<[boolean]>
    readonly autoStart: JDRegisterServer<[boolean]>
    readonly logging: JDRegisterServer<[boolean]>
    readonly programSize: JDRegisterServer<[number]>
    readonly programHash: JDRegisterServer<[number]>

    private _binary: Uint8Array = new Uint8Array(0)
    private _debugInfo: unknown

    static PROGRAM_CHANGE = "programChange"

    constructor() {
        super(SRV_JACSCRIPT_MANAGER)

        this.running = this.addRegister(JacscriptManagerReg.Running, [false])
        this.autoStart = this.addRegister(JacscriptManagerReg.Autostart, [true])
        this.logging = this.addRegister(JacscriptManagerReg.Logging, [true])
        this.programSize = this.addRegister(JacscriptManagerReg.ProgramSize, [
            this._binary.length,
        ])
        this.programHash = this.addRegister(JacscriptManagerReg.ProgramHash, [
            fnv1(this._binary),
        ])

        this.addCommand(
            JacscriptManagerCmd.DeployBytecode,
            this.handleDeployBytecode.bind(this)
        )
        this.addCommand(
            JacscriptManagerCmd.ReadBytecode,
            this.handleReadBytecode.bind(this)
        )
    }

    get binary() {
        return this._binary
    }

    get debugInfo() {
        return this._debugInfo
    }

    setBytecode(binary: Uint8Array, debugInfo: unknown) {
        binary = binary || new Uint8Array(0)
        const [hash] = this.programHash.values()
        const valueHash = fnv1(binary)

        if (hash !== valueHash) {
            this._binary = binary
            this._debugInfo = debugInfo
            this.programSize.setValues([binary.length])
            this.programHash.setValues([valueHash])
            this.emit(JacscriptManagerServer.PROGRAM_CHANGE)
            this.emit(CHANGE)
            this.sendEvent(JacscriptManagerEvent.ProgramChange)
        }
    }

    private handleDeployBytecode(pkt: Packet) {
        console.debug(`jacscript server: deploy`, { pkt })
    }

    private async handleReadBytecode(pkt: Packet) {
        const pipe = OutPipe.from(this.device.bus, pkt, true)
        await pipe.sendBytes(this._binary)
        await pipe.close()
    }
}

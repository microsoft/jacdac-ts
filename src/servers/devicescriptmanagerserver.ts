import { fnv1 } from "../jdom/utils"
import {
    CHANGE,
    DeviceScriptManagerCmd,
    DeviceScriptManagerEvent,
    DeviceScriptManagerReg,
    SRV_DEVICE_SCRIPT_MANAGER,
} from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer } from "../jdom/servers/serviceserver"
import { OutPipe } from "../jdom/pipes"
import { Packet } from "../jdom/packet"

export class DeviceScriptManagerServer extends JDServiceServer {
    readonly running: JDRegisterServer<[boolean]>
    readonly autoStart: JDRegisterServer<[boolean]>
    readonly programSize: JDRegisterServer<[number]>
    readonly programHash: JDRegisterServer<[number]>

    private _binary: Uint8Array = new Uint8Array(0)
    private _debugInfo: unknown

    static PROGRAM_CHANGE = "programChange"

    constructor() {
        super(SRV_DEVICE_SCRIPT_MANAGER)

        this.running = this.addRegister(DeviceScriptManagerReg.Running, [false])
        this.autoStart = this.addRegister(DeviceScriptManagerReg.Autostart, [
            true,
        ])
        this.programSize = this.addRegister(
            DeviceScriptManagerReg.ProgramSize,
            [this._binary.length],
        )
        this.programHash = this.addRegister(
            DeviceScriptManagerReg.ProgramHash,
            [fnv1(this._binary)],
        )

        this.addCommand(
            DeviceScriptManagerCmd.DeployBytecode,
            this.handleDeployBytecode.bind(this),
        )
        this.addCommand(
            DeviceScriptManagerCmd.ReadBytecode,
            this.handleReadBytecode.bind(this),
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
            this.emit(DeviceScriptManagerServer.PROGRAM_CHANGE)
            this.emit(CHANGE)
            this.sendEvent(DeviceScriptManagerEvent.ProgramChange)
        }
    }

    private handleDeployBytecode(pkt: Packet) {
        console.debug(`devicescript server: deploy`, { pkt })
    }

    private async handleReadBytecode(pkt: Packet) {
        const pipe = OutPipe.from(this.device.bus, pkt, true)
        await pipe.sendBytes(this._binary)
        await pipe.close()
    }
}

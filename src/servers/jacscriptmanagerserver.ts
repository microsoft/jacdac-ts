import { fnv1 } from "../jdom/utils"
import {
    CHANGE,
    JacscriptManagerEvent,
    JacscriptManagerReg,
    SRV_JACSCRIPT_MANAGER,
} from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer } from "../jdom/servers/serviceserver"

export abstract class JacscriptManagerServer extends JDServiceServer {
    readonly running: JDRegisterServer<[boolean]>
    readonly autoStart: JDRegisterServer<[boolean]>
    readonly logging: JDRegisterServer<[boolean]>
    readonly programSize: JDRegisterServer<[number]>
    readonly programHash: JDRegisterServer<[number]>

    private _bytecode: Uint8Array = new Uint8Array(0)

    constructor() {
        super(SRV_JACSCRIPT_MANAGER)

        this.running = this.addRegister(JacscriptManagerReg.Running, [false])
        this.autoStart = this.addRegister(JacscriptManagerReg.Running, [true])
        this.logging = this.addRegister(JacscriptManagerReg.Logging, [true])
        this.programSize = this.addRegister(JacscriptManagerReg.ProgramSize, [
            this._bytecode.length,
        ])
        this.programHash = this.addRegister(JacscriptManagerReg.ProgramHash, [
            fnv1(this._bytecode),
        ])
    }

    get bytecode() {
        return this._bytecode
    }

    set bytecode(value: Uint8Array) {
        const [hash] = this.programHash.values()
        const valueHash = fnv1(value)

        if (hash !== valueHash) {
            this._bytecode = value
            this.programSize.setValues([value.length])
            this.programHash.setValues([valueHash])
            this.emit(CHANGE)
            this.sendEvent(JacscriptManagerEvent.ProgramChange)
        }
    }
}

import {
    CHANGE,
    EVENT,
    JacscriptManagerCmd,
    JacscriptManagerEvent,
    JacscriptManagerReg,
} from "../constants"
import { jdpack } from "../pack"
import { OutPipe } from "../pipes"
import { JDService } from "../service"
import { JDServiceClient } from "../serviceclient"

export class JacscriptManagerClient extends JDServiceClient {
    constructor(service: JDService) {
        super(service)

        // report events
        const changeEvent = service.event(JacscriptManagerEvent.ProgramChange)
        this.mount(changeEvent.subscribe(EVENT, () => this.emit(CHANGE)))
        this.mount(
            changeEvent.subscribe(EVENT, () =>
                this.emit(JacscriptManagerClient.PROGRAM_CHANGE)
            )
        )

        const panicEvent = service.event(JacscriptManagerEvent.ProgramPanic)
        this.mount(
            panicEvent.subscribe(EVENT, (args: unknown[]) =>
                this.emit(JacscriptManagerClient.PROGRAM_PANIC, ...(args || []))
            )
        )
    }

    static PROGRAM_CHANGE = "programChange"
    static PROGRAM_PANIC = "programPanic"

    async deployBytecode(
        bytecode: Uint8Array,
        onProgress?: (p: number) => void
    ) {
        return OutPipe.sendBytes(
            this.service,
            JacscriptManagerCmd.DeployBytecode,
            bytecode,
            onProgress
        )
    }

    async setRunning(value: boolean) {
        const reg = this.service.register(JacscriptManagerReg.Running)
        await reg.sendSetAsync(jdpack("u8", [value ? 1 : 0]))
    }

    async setAutoStart(value: boolean) {
        const reg = this.service.register(JacscriptManagerReg.Autostart)
        await reg.sendSetAsync(jdpack("u8", [value ? 1 : 0]))
    }

    async setLogging(value: boolean) {
        const reg = this.service.register(JacscriptManagerReg.Logging)
        await reg.sendSetAsync(jdpack("u8", [value ? 1 : 0]))
    }
}

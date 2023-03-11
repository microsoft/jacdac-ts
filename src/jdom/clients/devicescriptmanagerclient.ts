import {
    CHANGE,
    EVENT,
    DeviceScriptManagerCmd,
    DeviceScriptManagerEvent,
    DeviceScriptManagerReg,
} from "../constants"
import { jdpack } from "../pack"
import { OutPipe } from "../pipes"
import { JDService } from "../service"
import { JDServiceClient } from "../serviceclient"

export class DeviceScriptManagerClient extends JDServiceClient {
    constructor(service: JDService) {
        super(service)

        // report events
        const changeEvent = service.event(
            DeviceScriptManagerEvent.ProgramChange
        )
        this.mount(changeEvent.subscribe(EVENT, () => this.emit(CHANGE)))
        this.mount(
            changeEvent.subscribe(EVENT, () =>
                this.emit(DeviceScriptManagerClient.PROGRAM_CHANGE)
            )
        )

        const panicEvent = service.event(DeviceScriptManagerEvent.ProgramPanic)
        this.mount(
            panicEvent.subscribe(EVENT, (args: unknown[]) =>
                this.emit(
                    DeviceScriptManagerClient.PROGRAM_PANIC,
                    ...(args || [])
                )
            )
        )
    }

    static PROGRAM_CHANGE = "programChange"
    static PROGRAM_PANIC = "programPanic"

    deployBytecode(bytecode: Uint8Array, onProgress?: (p: number) => void) {
        return OutPipe.sendBytes(
            this.service,
            DeviceScriptManagerCmd.DeployBytecode,
            bytecode,
            onProgress
        )
    }

    async setRunning(value: boolean) {
        const reg = this.service.register(DeviceScriptManagerReg.Running)
        await reg.sendSetAsync(jdpack("u8", [value ? 1 : 0]))
    }

    async setAutoStart(value: boolean) {
        const reg = this.service.register(DeviceScriptManagerReg.Autostart)
        await reg.sendSetAsync(jdpack("u8", [value ? 1 : 0]))
    }
}

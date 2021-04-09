import { JDService } from "./service"
import { SystemCmd, SystemReg } from "../../jacdac-spec/dist/specconstants"

export function calibrateAsync(service: JDService) {
    return service.sendCmdAsync(SystemCmd.Calibrate)
}

export function setThresholdAsync(
    service: JDService,
    low: boolean,
    value: number
) {
    const register = service.register(
        low ? SystemReg.LowThreshold : SystemReg.HighThreshold
    )
    return register?.sendSetPackedAsync("i32", [value]) || Promise.resolve()
}

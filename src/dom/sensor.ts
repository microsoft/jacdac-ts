import { JDService } from "./service";
import { BaseCmd, BaseReg } from "../../jacdac-spec/dist/specconstants";

export function calibrateAsync(service: JDService) {
    return service.sendCmdAsync(BaseCmd.Calibrate);
}

export function setThresholdAsync(service: JDService, low: boolean, value: number) {
    const register = service.register(low ? BaseReg.LowThreshold : BaseReg.HighThreshold)
    return register?.sendSetIntAsync(value) || Promise.resolve()
}
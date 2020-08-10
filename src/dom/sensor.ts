import { JDService } from "./service";
import { REG_IS_STREAMING, CMD_CALIBRATE, REG_LOW_THRESHOLD, REPORT_RECEIVE } from "./constants";

export function setStreamingAsync(service: JDService, on: boolean) {
    const register = service.register(REG_IS_STREAMING);
    return register?.sendSetBoolAsync(on) || Promise.resolve()
}

export function calibrateAsync(service: JDService) {
    return service.sendCmdAsync(CMD_CALIBRATE);
}

export function setThresholdAsync(service: JDService, low: boolean, value: number) {
    const register = service.register(low ? REG_LOW_THRESHOLD : REG_LOW_THRESHOLD)
    return register?.sendSetIntAsync(value) || Promise.resolve()
}
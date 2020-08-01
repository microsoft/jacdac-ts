import { JDService } from "./service";
import { REG_IS_STREAMING, CMD_CALIBRATE, REG_LOW_THRESHOLD, REPORT_RECEIVE } from "./constants";
import { bufferOfInt } from "./struct";
import { debouncedPollAsync } from "./utils";

export function setStreamingAsync(service: JDService, on: boolean) {
    const register = service.registerAt(REG_IS_STREAMING);
    return register.sendSetAsync(bufferOfInt(on ? 1 : 0))
}

export function calibrateAsync(service: JDService) {
    return service.sendCmdAsync(CMD_CALIBRATE);
}

export function setThresholdAsync(service: JDService, low: boolean, value: number) {
    const register = service.registerAt(low ? REG_LOW_THRESHOLD : REG_LOW_THRESHOLD)
    return register.sendSetAsync(bufferOfInt(value))
}
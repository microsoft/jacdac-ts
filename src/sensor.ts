import { Service } from "./service";
import { REG_IS_STREAMING, CMD_CALIBRATE, REG_LOW_THRESHOLD } from "./constants";
import { bufferOfInt } from "./buffer";

export function setStreamingAsync(service: Service, on: boolean) {
    const register = service.registerAt(REG_IS_STREAMING);
    return register.sendSetAsync(bufferOfInt(on ? 1 : 0))
}

export function calibrateAsync(service: Service) {
    return service.sendCmdAsync(CMD_CALIBRATE);
}

export function setThresholdAsync(service: Service, low: boolean, value: number) {
    const register = service.registerAt(low ? REG_LOW_THRESHOLD : REG_LOW_THRESHOLD)
    return register.sendSetAsync(bufferOfInt(value))
}

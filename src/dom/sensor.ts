import { JDService } from "./service";
import { REG_IS_STREAMING, CMD_CALIBRATE, REG_LOW_THRESHOLD, REPORT_RECEIVE, REG_STREAMING_INTERVAL, SensorReg } from "./constants";

/**
 * Indicates if the service can stream data
 * @param service 
 */
export function canStream(service: JDService): boolean {
    return !!service.readingRegister
        && !!service.register(SensorReg.IsStreaming)
        && !!service.register(SensorReg.StreamingInterval);
}

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
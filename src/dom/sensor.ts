import { JDService } from "./service";
import { REG_IS_STREAMING, CMD_CALIBRATE, REG_LOW_THRESHOLD, SensorReg } from "./constants";
import { isReading } from "./spec";

/**
 * Indicates if the service can stream data
 * @param service 
 */
export function isSensor(service: JDService): boolean {
    const spec = service.specification;
    return spec?.packets.some(pkt => isReading(pkt))
    && spec?.packets.some(pkt => pkt.identifier == SensorReg.IsStreaming)
    && spec?.packets.some(pkt => pkt.identifier == SensorReg.StreamingInterval)
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
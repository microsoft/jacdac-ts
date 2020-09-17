import { JDService } from "./service";
import { SensorReg } from "./constants";
import { isReading } from "./spec";
import { BaseCmd, BaseReg } from "../../jacdac-spec/dist/specconstants";

/**
 * Indicates if the service can stream data
 * @param service 
 */
export function isSensor(service: JDService): boolean {
    const spec = service.specification;
    return spec?.packets.some(pkt => isReading(pkt))
        && spec?.packets.some(pkt => pkt.identifier == SensorReg.StreamSamples)
        && spec?.packets.some(pkt => pkt.identifier == SensorReg.StreamingInterval)
}

export async function setStreamingAsync(service: JDService, on: boolean) {
    // check if this register is supported
    const register = service.register(SensorReg.StreamSamples);
    if (!register)
        return;

    // 25 samples at 20ms is 500ms 
    // which gives the chance to restart the streaming
    // from another spot
    await register.sendSetIntAsync(on ? 0xff : 25)
}

export function calibrateAsync(service: JDService) {
    return service.sendCmdAsync(BaseCmd.Calibrate);
}

export function setThresholdAsync(service: JDService, low: boolean, value: number) {
    const register = service.register(low ? BaseReg.LowThreshold : BaseReg.HighThreshold)
    return register?.sendSetIntAsync(value) || Promise.resolve()
}
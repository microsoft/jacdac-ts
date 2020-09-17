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

export function setStreamingAsync(service: JDService, on: boolean) {
    const register = service.register(SensorReg.StreamSamples);
    // don't explicitly turn off streaming; just let it fade away
    // another device might me relying on streaming
    return (on && register?.sendSetIntAsync(0xff)) || Promise.resolve()
}

export function calibrateAsync(service: JDService) {
    return service.sendCmdAsync(BaseCmd.Calibrate);
}

export function setThresholdAsync(service: JDService, low: boolean, value: number) {
    const register = service.register(low ? BaseReg.LowThreshold : BaseReg.HighThreshold)
    return register?.sendSetIntAsync(value) || Promise.resolve()
}
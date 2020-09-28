import { JDService } from "./service";
import { SensorReg } from "./constants";
import { isReading } from "./spec";
import { BaseCmd, BaseReg } from "../../jacdac-spec/dist/specconstants";
import { BusState } from "./bus";

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

export function startStreaming(service: JDService): () => void {
    // check if this register is supported
    const register = service.register(SensorReg.StreamSamples);
    if (!register)
        return () => { };

    const intervalRegister = service.register(SensorReg.StreamingInterval)
    const samplingTime = intervalRegister?.intValue || 20;
    const intervalTime = Math.max(500, samplingTime * (0xff >> 1));

    const ping = () => {
        if (register.service.device.bus.connectionState === BusState.Connected) {
            console.log(`ping streaming ${register}`)
            register.sendSetIntAsync(0xff);
        }
    }

    let interval = setInterval(ping, intervalTime);
    ping();

    return () => {
        clearInterval(interval);
    }
}

export function calibrateAsync(service: JDService) {
    return service.sendCmdAsync(BaseCmd.Calibrate);
}

export function setThresholdAsync(service: JDService, low: boolean, value: number) {
    const register = service.register(low ? BaseReg.LowThreshold : BaseReg.HighThreshold)
    return register?.sendSetIntAsync(value) || Promise.resolve()
}
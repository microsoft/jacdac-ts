import { Service } from "./service";
import { REG_IS_STREAMING, CMD_CALIBRATE, REG_LOW_THRESHOLD, REPORT_RECEIVE } from "./constants";
import { bufferOfInt } from "./struct";
import { DebouncedPoll, debouncedPollAsync } from "./utils";

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

/**
 * Starts a debounced task to check that a device is streaming. Return unsubscribe function.
 * @param service 
 */
export function ensureStreamingSubscription(service: Service): () => void {
    const register = service.registerAt(REG_IS_STREAMING)
    const startStreaming = async () => {
        console.log("start streaming")
        await setStreamingAsync(this.register.service, true)
    }
    const ensureStreaming = debouncedPollAsync(startStreaming, 1000, 2000);
    const observable = register.observe(REPORT_RECEIVE);
    return observable.subscribe({
        next: this.ensureStreaming.execute(),
        error: e => ensureStreaming.stop(),
        complete: () => {
            ensureStreaming.stop()
            setStreamingAsync(register.service, false)
        }
    }).unsubscribe
}
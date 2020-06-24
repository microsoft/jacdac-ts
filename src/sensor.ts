import { Device } from "./device";
import { Packet } from "./packet";
import { CMD_SET_REG, REG_IS_STREAMING, CMD_CALIBRATE, REG_LOW_THRESHOLD } from "./constants";

export class Client {
    constructor(
        public device: Device,
        public service_class: number) {

    }

    protected setRegIntAsync(reg: number, value: number): Promise<void> {
        const pkt = Packet.packed(CMD_SET_REG | reg, "i", [value]);
        return pkt.sendCmdAsync(this.device);
    }
}

export class SensorClient extends Client {
    constructor(
        public device: Device,
        public service_class: number) {
        super(device, service_class);
    }

    static from(device: Device, service_class: number): SensorClient {
        if (device && device.hasService(service_class))
            return new SensorClient(device, service_class);
        return undefined;
    }

    public setStreamingAsync(on: boolean) {
        return this.setRegIntAsync(REG_IS_STREAMING, on ? 1 : 0)
    }

    public calibrateAsync() {
        const pkt = Packet.onlyHeader(CMD_CALIBRATE);
        return pkt.sendCmdAsync(this.device);
    }

    public setThresholdAsync(low: boolean, value: number) {
        return this.setRegIntAsync(low ? REG_LOW_THRESHOLD : REG_LOW_THRESHOLD, value)
    }
}
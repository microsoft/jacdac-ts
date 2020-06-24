import { Device } from "./device";
import { Packet } from "./packet";
import { CMD_SET_REG, REG_IS_STREAMING, CMD_CALIBRATE, REG_LOW_THRESHOLD, CMD_GET_REG } from "./constants";

export class Client {
    constructor(
        public device: Device,
        public service_number: number) {
    }

    setRegIntAsync(reg: number, value: number): Promise<void> {
        const pkt = Packet.packed(CMD_SET_REG | reg, "i", [value]);
        pkt.service_number = this.service_number;
        return pkt.sendCmdAsync(this.device);
    }

    sendCmdAsync(cmd: number) {
        const pkt = Packet.onlyHeader(cmd);
        pkt.service_number = this.service_number;
        return pkt.sendCmdAsync(this.device);
    }
}

export class SensorClient extends Client {
    constructor(
        device: Device,
        service_number: number) {
        super(device, service_number);
    }

    static fromFirstServiceClass(device: Device, service_class: number): SensorClient {
        const n = device.serviceLength;
        for (let i = 0; i < n; ++i) {
            if (device.serviceClassAt(i) == service_class)
                return new SensorClient(device, i);
        }
        return undefined;
    }

    public setStreamingAsync(on: boolean) {
        return this.setRegIntAsync(REG_IS_STREAMING, on ? 1 : 0)
    }

    public calibrateAsync() {
        return this.sendCmdAsync(CMD_CALIBRATE);
    }

    public setThresholdAsync(low: boolean, value: number) {
        return this.setRegIntAsync(low ? REG_LOW_THRESHOLD : REG_LOW_THRESHOLD, value)
    }
}
import { Device } from "./device";
import { Packet } from "./packet";
import { serviceName } from "./pretty";

export class Service {
    constructor(
        public device: Device,
        public service_number: number
    ) {

    }

    public get serviceClass() {
        return this.device.serviceClassAt(this.service_number);
    }

    public get name() {
        return serviceName(this.serviceClass)
    }

    public sendCmdAsync(pkt: Packet) {
        pkt.dev = this.device;
        pkt.service_number = this.service_number;
        return pkt.sendCmdAsync(this.device);
    }
}
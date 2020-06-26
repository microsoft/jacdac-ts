import { Device } from "./device";
import { Packet } from "./packet";

export class Service {
    constructor(
        public device: Device,
        public service_number: number
    ) {

    }

    public get serviceClass() {
        return this.device.serviceClassAt(this.service_number);
    }

    public sendCmdAsync(pkt: Packet) {
        pkt.dev = this.device;
        pkt.service_number = this.service_number;
        return pkt.sendCmdAsync(this.device);
    }
}
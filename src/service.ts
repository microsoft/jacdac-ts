import { Device } from "./device";
import { Packet } from "./packet";
import { serviceName } from "./pretty";
import { Register } from "./register";

export class Service {
    private _registers: Register[];

    constructor(
        public device: Device,
        public service_number: number
    ) {

    }

    public register(address: number): Register {
        address = address | 0;
        if (!this._registers)
            this._registers = [];
        let register = this._registers[address];
        if (!register)
            register = this._registers[address] = new Register(this, address);
        return register;
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
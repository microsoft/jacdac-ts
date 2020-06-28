import { Device } from "./device";
import { Packet } from "./packet";
import { serviceName } from "./pretty";
import { Register } from "./register";
import { CMD_REG_MASK, PACKET_RECEIVE, PACKET_SEND } from "./constants";
import { EventEmitter } from "./eventemitter";

export class Service extends EventEmitter {
    private _registers: Register[];

    constructor(
        public readonly device: Device,
        public readonly service_number: number
    ) {
        super()
    }

    get serviceClass() {
        return this.device.serviceClassAt(this.service_number);
    }

    get name() {
        return serviceName(this.serviceClass)
    }

    register(options?: { address: number }): Register {
        const address = options?.address | 0;
        if (!this._registers)
            this._registers = [];
        let register = this._registers[address];
        if (!register)
            register = this._registers[address] = new Register(this, address);
        return register;
    }

    sendCmdAsync(pkt: Packet) {
        pkt.dev = this.device;
        pkt.service_number = this.service_number;
        this.emit(PACKET_SEND, pkt)
        return pkt.sendCmdAsync(this.device);
    }

    processPacket(pkt: Packet) {
        this.emit(PACKET_RECEIVE, pkt)
        if (pkt.is_report) {
            const address = pkt.service_command & CMD_REG_MASK
            const reg = this.register({ address })
            if (reg)
                reg.processReport(pkt);
        }
    }
}
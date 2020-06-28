import { Packet } from "./packet";
import { CMD_SET_REG, REPORT_RECEIVE, REPORT_UPDATE } from "./constants";
import { Service } from "./service";
import { intOfBuffer } from "./buffer";
import { Node } from "./node";
import { bufferEq } from "./utils";
import { bufferOfInt } from "./struct";

export class Register extends Node {
    private _data: Uint8Array;
    public lastData: number;

    constructor(
        public readonly service: Service,
        public readonly address: number) {
        super()
    }

    get id() {
        return `reg:${this.service.device.deviceId}:${this.service.service_number.toString(16)}:${this.address.toString(16)}`
    }

    // send a message to set the register value
    sendSetAsync(data: Uint8Array): Promise<void> {
        const cmd = CMD_SET_REG | this.address;
        const pkt = Packet.from(cmd, data)
        return this.service.sendPacketAsync(pkt);
    }

    sendSetIntAsync(value: number): Promise<void> {
        return this.sendSetAsync(bufferOfInt(value))
    }

    get data() {
        return this._data;
    }

    get intValue(): number {
        return this.data && intOfBuffer(this.data);
    }

    processReport(pkt: Packet) {
        const updated = !bufferEq(this._data, pkt.data)
        this._data = pkt.data;
        this.lastData = pkt.timestamp;
        this.emit(REPORT_RECEIVE, this)
        if (updated)
            this.emit(REPORT_UPDATE, this)
    }
}

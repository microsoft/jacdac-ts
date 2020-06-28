import { Packet } from "./packet";
import { CMD_SET_REG, REPORT_RECEIVE, REPORT_UPDATE } from "./constants";
import { Service } from "./service";
import { intOfBuffer } from "./buffer";
import { EventEmitter } from "./eventemitter";
import { bufferEq } from "./utils";

export class Register extends EventEmitter {
    private _data: Uint8Array;

    constructor(
        public readonly service: Service,
        public readonly address: number) {
        super()
    }

    // send a message to set the register value
    setAsync(data: Uint8Array): Promise<void> {
        const cmd = CMD_SET_REG | this.address;
        const pkt = Packet.from(cmd, data)
        return this.service.sendCmdAsync(pkt);
    }

    get data() {
        return this._data;
    }

    processReport(pkt: Packet) {
        const updated = !bufferEq(this._data, pkt.data)
        this._data = pkt.data;
        this.emit(REPORT_RECEIVE, this)
        if (updated)
            this.emit(REPORT_UPDATE, this)
    }

    get intValue(): number {
        // TODO unpack
        return this.data && intOfBuffer(this.data);
    }
}

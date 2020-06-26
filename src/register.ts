import { Packet } from "./packet";
import { CMD_SET_REG } from "./constants";
import { Service } from "./service";
import { intOfBuffer } from "./buffer";

export class Register {
    data: Uint8Array;

    constructor(
        public service: Service,
        public address: number) {
    }

    // send a message to set the register value
    setAsync(data: Uint8Array): Promise<void> {
        const cmd = CMD_SET_REG | this.address;
        const pkt = Packet.from(cmd, data)
        return this.service.sendCmdAsync(pkt);
    }

    get intValue(): number {
        // TODO unpack
        return this.data && intOfBuffer(this.data);
    }
}

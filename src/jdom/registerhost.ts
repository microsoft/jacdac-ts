import JDServiceHost from "./servicehost";
import { jdpack, jdunpack } from "./pack";
import Packet from "./packet";
import { bufferEq } from "./utils";
import { JDEventSource } from "./eventsource";
import { CHANGE, CMD_GET_REG } from "./constants";

export default class JDRegisterHost extends JDEventSource {
    data: Uint8Array;

    constructor(
        public readonly service: JDServiceHost,
        public readonly identifier: number,
        public readonly packFormat: string,
        defaultValue: any[]) {
        super();
        this.data = jdpack(this.packFormat, defaultValue);
    }

    values<T extends any[]>(): T {
        return jdunpack(this.data, this.packFormat) as T;
    }

    setValues<T extends any[]>(values: T) {
        const d = jdpack(this.packFormat, values);
        if (!bufferEq(this.data, d)) {
            this.data = d;
            this.emit(CHANGE);
        }
    }

    sendReport() {
        this.service.sendPacketAsync(Packet.from(this.identifier | CMD_GET_REG, this.data));
    }

    handlePacket(pkt: Packet): boolean {
        if (this.identifier !== pkt.registerIdentifier)
            return false;

        if (pkt.isRegisterGet) { // get
            this.service.sendPacketAsync(Packet.from(pkt.serviceCommand, this.data));
        } else if (this.identifier >> 8 !== 0x1) { // set, non-const
            const d = pkt.data;
            if (!bufferEq(this.data, d)) {
                this.data = d;
                this.emit(CHANGE);
            }
        }
        return true;
    }
}

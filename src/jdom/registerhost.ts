import JDServiceHost from "./servicehost";
import { jdpack, jdunpack } from "./pack";
import Packet from "./packet";
import { assert, bufferEq } from "./utils";
import { JDEventSource } from "./eventsource";
import { CHANGE, CMD_GET_REG } from "./constants";
import { isRegister } from "./spec";

export default class JDRegisterHost extends JDEventSource {
    data: Uint8Array;
    readonly specification: jdspec.PacketInfo;

    constructor(
        public readonly service: JDServiceHost,
        public readonly identifier: number,
        defaultValue: any[]) {
        super();
        const serviceSpecification = this.service.specification;
        this.specification = serviceSpecification.packets.find(pkt => isRegister(pkt) && pkt.identifier === this.identifier);
        this.data = jdpack(this.packFormat, defaultValue);
    }

    get packFormat() {
        return this.specification.packFormat;
    }

    values<T extends any[]>(): T {
        return jdunpack(this.data, this.packFormat) as T;
    }

    setValues<T extends any[]>(values: T) {
        // enforce boundaries
        this.specification?.fields.forEach((field, fieldi) => {
            if (field.isSimpleType) {
                let value = values[fieldi] as number;
                // clamp within bounds
                const min = field.absoluteMin;
                if (min !== undefined)
                    value = Math.max(min, value);
                const max = field.absoluteMax;
                if (max !== undefined)
                    value = Math.min(max, value);
                // update
                values[fieldi] = value;
            }
        })

        const d = jdpack(this.packFormat, values);
        if (!bufferEq(this.data, d)) {
            this.data = d;
            this.emit(CHANGE);
        }
    }

    async sendGetAsync() {
        await this.service.sendPacketAsync(Packet.from(this.identifier | CMD_GET_REG, this.data));
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

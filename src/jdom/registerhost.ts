import JDServiceHost from "./servicehost";
import { jdpack, jdunpack } from "./pack";
import Packet from "./packet";
import { bufferEq, pick } from "./utils";
import { JDEventSource } from "./eventsource";
import { CHANGE, CMD_GET_REG, REPORT_RECEIVE } from "./constants";
import { isRegister } from "./spec";

function defaultFieldPayload(specification: jdspec.PacketMember) {
    let r: any = undefined;
    switch (specification.type) {
        case "bool":
            r = 0;
            break;
        case "i8":
        case "i16":
        case "i32":
        case "u8":
        case "u16":
        case "u32": {
            const min = pick(specification.typicalMin, specification.absoluteMin, undefined);
            const max = pick(specification.typicalMax, specification.absoluteMax, undefined);
            if (max !== undefined && min !== undefined)
                r = 0;
            else
                r = (max + min) / 2;
            break;
        }
        case "bytes": {
            r = new Uint8Array(0);
            break;
        }
        case "string":
        case "string0": {
            r = "";
            break;
        }
    }

    return r;
}

function defaultPayload<T extends any[]>(specification: jdspec.PacketInfo): T {
    const { fields } = specification;
    const rs = fields.map(defaultFieldPayload);
    return rs as T;
}

export default class JDRegisterHost extends JDEventSource {
    data: Uint8Array;
    readonly specification: jdspec.PacketInfo;

    constructor(
        public readonly service: JDServiceHost,
        public readonly identifier: number,
        defaultValue?: any[]) {
        super();
        const serviceSpecification = this.service.specification;
        this.specification = serviceSpecification.packets.find(pkt => isRegister(pkt) && pkt.identifier === this.identifier);
        this.data = jdpack(this.packFormat, defaultValue || defaultPayload(this.specification));
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
            let changed = false;
            const d = pkt.data;
            if (!bufferEq(this.data, d)) {
                this.data = d;
                changed = true;
            }
            this.emit(REPORT_RECEIVE);
            if (changed)
                this.emit(CHANGE);
    }
        return true;
    }
}

import { Packet } from "./packet";
import { CMD_SET_REG, REPORT_RECEIVE, REPORT_UPDATE, CHANGE, SRV_LIGHT_SPECTRUM_SENSOR, CMD_GET_REG, REGISTER_NODE_NAME } from "./constants";
import { JDService } from "./service";
import { intOfBuffer } from "./buffer";
import { JDNode } from "./node";
import { bufferEq, toHex, fromUTF8, uint8ArrayToString, toUTF8, stringToUint8Array, delay } from "./utils";
import { bufferOfInt } from "./struct";
import { decodePacketData, DecodedPacket } from "./pretty";
import { isRegister, isReading } from "./spec";
import { JDField } from "./field";

export class JDRegister extends JDNode {
    private _lastReportPkt: Packet;
    private _lastDecodedPkt: DecodedPacket;
    private _specification: jdspec.PacketInfo;
    private _fields: JDField[];

    constructor(
        public readonly service: JDService,
        public readonly address: number) {
        super()
    }

    get id() {
        return `${this.nodeKind}:${this.service.device.deviceId}:${this.service.service_number.toString(16)}:${this.address.toString(16)}`
    }

    get name() {
        return this.specification?.name || this.address.toString(16);
    }

    get nodeKind() {
        return REGISTER_NODE_NAME
    }

    get fields() {
        if (!this._fields)
            this._fields = this.specification?.fields.map((field, index) => new JDField(this, index, field));
        return this._fields;
    }

    // send a message to set the register value
    sendSetAsync(data: Uint8Array, autoRefresh?: boolean): Promise<void> {
        const cmd = CMD_SET_REG | this.address;
        const pkt = Packet.from(cmd, data)
        let p = this.service.sendPacketAsync(pkt)
        if (autoRefresh)
            p = delay(50).then(() => this.sendGetAsync())
        return p;
    }

    sendGetAsync(): Promise<void> {
        const cmd = CMD_GET_REG | this.address;
        return this.service.sendCmdAsync(cmd)
    }

    sendSetIntAsync(value: number, autoRefresh?: boolean): Promise<void> {
        return this.sendSetAsync(bufferOfInt(value), autoRefresh)
    }

    sendSetBoolAsync(value: boolean, autoRefresh?: boolean): Promise<void> {
        return this.sendSetIntAsync(value ? 1 : 0, autoRefresh)
    }

    sendSetStringAsync(value: string, autoRefresh?: boolean): Promise<void> {
        return this.sendSetAsync(stringToUint8Array(toUTF8(value || "")), autoRefresh)
    }

    get specification() {
        if (!this._specification)
            this._specification = this.service.specification?.packets.find(packet => isRegister(packet) && packet.identifier === this.address)
        return this._specification;
    }

    get isReading() {
        return this.specification && isReading(this.specification)
    }

    get data() {
        return this._lastReportPkt?.data;
    }

    get lastDataTimestamp() {
        return this._lastReportPkt?.timestamp
    }

    get intValue(): number {
        const d = this.data;
        return d && intOfBuffer(d);
    }

    get boolValue(): boolean {
        if (this.data === undefined) return undefined;
        return !!this.intValue;
    }

    get stringValue(): string {
        const buf = this.data;
        if (buf === undefined) return undefined;

        let value: string;
        try {
            value = fromUTF8(uint8ArrayToString(buf))
        } catch {
            // invalid UTF8
            value = uint8ArrayToString(buf)
        }
        return value;
    }

    get humanValue(): string {
        return this.decoded?.decoded?.map(field => field.humanValue).join(',');
    }

    toString() {
        const d = this.data;
        return `${this.id} ${d ? toHex(d) : ""}`
    }

    get decoded(): DecodedPacket {
        if (!this._lastDecodedPkt) {
            this._lastDecodedPkt = this._lastReportPkt
                && decodePacketData(this._lastReportPkt);
        }
        return this._lastDecodedPkt;
    }

    processReport(pkt: Packet) {
        const updated = !bufferEq(this.data, pkt.data)
        this._lastReportPkt = pkt;
        this._lastDecodedPkt = undefined;
        this.emit(REPORT_RECEIVE, this)
        if (updated) {
            this.emit(REPORT_UPDATE, this)
            this.emit(CHANGE)
        }
    }
}

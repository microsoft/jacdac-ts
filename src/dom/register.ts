import { Packet } from "./packet";
import { CMD_SET_REG, REPORT_RECEIVE, REPORT_UPDATE, CHANGE, SRV_LIGHT_SPECTRUM_SENSOR, CMD_GET_REG } from "./constants";
import { JDService } from "./service";
import { intOfBuffer } from "./buffer";
import { JDNode } from "./node";
import { bufferEq, toHex, fromUTF8, uint8ArrayToString, toUTF8, stringToUint8Array } from "./utils";
import { bufferOfInt } from "./struct";
import { decodePacketData, DecodedPacket } from "./pretty";

export class JDRegister extends JDNode {
    private _lastReportPkt: Packet;

    constructor(
        public readonly service: JDService,
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

    sendGetAsync(): Promise<void> {
        const cmd = CMD_GET_REG | this.address;
        return this.service.sendCmdAsync(cmd)
    }

    sendSetIntAsync(value: number): Promise<void> {
        return this.sendSetAsync(bufferOfInt(value))
    }

    sendSetBoolAsync(value: boolean): Promise<void> {
        return this.sendSetIntAsync(value ? 1 : 0)
    }

    sendSetStringAsync(value: string): Promise<void> {
        return this.sendSetAsync(stringToUint8Array(toUTF8(value || "")))
    }

    get specification() {
        return this.service.specification?.packets.find(packet => packet.identifier === this.address)
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

    toString() {
        const d = this.data;
        return `${this.id} ${d ? toHex(d) : ""}`
    }

    decode(): DecodedPacket {
        return this._lastReportPkt
            && decodePacketData(this._lastReportPkt);
    }

    processReport(pkt: Packet) {
        const updated = !bufferEq(this.data, pkt.data)
        this._lastReportPkt = pkt;
        this.emit(REPORT_RECEIVE, this)
        if (updated) {
            this.emit(REPORT_UPDATE, this)
            this.emit(CHANGE)
        }
    }
}

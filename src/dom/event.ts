import { JDNode } from "./node";
import { JDService } from "./service";
import Packet from "./packet";
import { intOfBuffer } from "./buffer";
import { CHANGE, EVENT, EVENT_NODE_NAME } from "./constants";
import { isEvent } from "./spec";

export class JDEvent extends JDNode {
    private _lastReportPkt: Packet;
    private _specification: jdspec.PacketInfo;
    private _count: number = 0;

    constructor(
        public readonly service: JDService,
        public readonly address: number) {
        super()
    }

    get id() {
        return `${this.nodeKind}:${this.service.device.deviceId}:${this.service.service_number.toString(16)}:${this.address.toString(16)}`
    }

    get nodeKind() {
        return EVENT_NODE_NAME
    }

    get data() {
        return this._lastReportPkt ? this._lastReportPkt.data.slice(4) : undefined
    }

    get specification() {
        if (!this._specification)
            this._specification = this.service.specification?.packets.find(packet => isEvent(packet) && packet.identifier === this.address)
        return this._specification;
    }

    get count() {
        return this._count;
    }

    get lastDataTimestamp() {
        return this._lastReportPkt?.timestamp
    }

    get intValue(): number {
        const d = this.data;
        return d && intOfBuffer(d);
    }

    processEvent(pkt: Packet) {
        this._lastReportPkt = pkt;
        this._count++;
        this.service.emit(EVENT, this)
        this.emit(CHANGE)
    }
}
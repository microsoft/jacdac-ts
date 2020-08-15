import { JDNode } from "./node";
import { JDService } from "./service";
import Packet from "./packet";
import { intOfBuffer } from "./buffer";
import { CHANGE, EVENT, EVENT_NODE_NAME } from "./constants";
import { isEvent } from "./spec";
import { JDServiceNode } from "./servicenode";

export class JDEvent extends JDServiceNode {
    private _lastReportPkt: Packet;
    private _count: number = 0;

    constructor(
        service: JDService,
        address: number) {
        super(service, address, isEvent)
    }

    get nodeKind() {
        return EVENT_NODE_NAME
    }

    get data() {
        return this._lastReportPkt ? this._lastReportPkt.data.slice(4) : undefined
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
        this.emit(EVENT)
        this.service.emit(EVENT, this)
        this.emit(CHANGE)
        //console.log(`event`, this, pkt)
    }
}
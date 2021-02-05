import { JDNode } from "./node";
import { JDService } from "./service";
import Packet from "./packet";
import { intOfBuffer } from "./buffer";
import { CHANGE, CMD_EVENT_COUNTER_MASK, EVENT, EVENT_NODE_NAME } from "./constants";
import { isEvent } from "./spec";
import { JDServiceMemberNode } from "./servicemembernode";

export class JDEvent extends JDServiceMemberNode {
    private _lastReportPkt: Packet;
    private _count: number = 0;

    constructor(
        service: JDService,
        code: number) {
        super(service, code, isEvent)
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

    get children(): JDNode[] {
        return [];
    }

    get intValue(): number {
        const d = this.data;
        return d && intOfBuffer(d);
    }

    processEvent(pkt: Packet) {
        const { device } = this.service;
        const ec = (device.eventCounter || 0) + 1;
        // how many packets ahead and behind current are we?
        const ahead = (pkt.eventCounter - ec) & CMD_EVENT_COUNTER_MASK;
        const behind = (ec - pkt.eventCounter) & CMD_EVENT_COUNTER_MASK;
        // ahead == behind == 0 is the usual case, otherwise
        // behind < 60 means this is an old event (or retransmission of something we already processed)
        const old = behind < 60;
        const missed5 = ahead < 5;
        const isahead = ahead > 0;

        // ahead < 5 means we missed at most 5 events, 
        // so we ignore this one and rely on retransmission
        // of the missed events, and then eventually the current event
        if (isahead && (old || missed5))
            return

        this._lastReportPkt = pkt;
        this._count++;
        this.emit(EVENT)
        this.service.emit(EVENT, this)
        this.emit(CHANGE)

        // update device counter
        device.eventCounter = pkt.eventCounter;
    }
}
import { JDBus } from "./bus";
import { JDClient } from "./client";
import { CHANGE, DEVICE_ANNOUNCE, PACKET_PROCESS, PACKET_SEND } from "./constants";
import Packet from "./packet";
import { PacketFilter, parsePacketFilter } from "./packetfilter";
import Trace from "./trace";
import { throttle } from "./utils";

const FILTERED_TRACE_MAX_ITEMS = 100;
const DUPLICATE_PACKET_MERGE_HORIZON_MAX_DISTANCE = 10;
const DUPLICATE_PACKET_MERGE_HORIZON_MAX_TIME = 5000;

export interface TracePacketProps {
    key: string;
    packet: Packet;
    count?: number;
}

export default class TraceView extends JDClient {
    private id = "v" + Math.random();
    private _maxFilteredLength = FILTERED_TRACE_MAX_ITEMS;

    private _trace: Trace;
    private _filter: string;
    private _packetFilter: PacketFilter = undefined;
    private _filteredPackets: TracePacketProps[] = [];

    private notifyPacketsChanged: () => void;

    constructor(public readonly bus: JDBus, filter: string, throttleDelay = 200) {
        super()
        this._trace = new Trace();
        this.handlePacket = this.handlePacket.bind(this);
        this.handleFilterUpdate = this.handleFilterUpdate.bind(this);

        this.notifyPacketsChanged = throttle(() => {
            this.setFilteredPackets();
        }, throttleDelay);

        this.mount(this.bus.subscribe([PACKET_PROCESS, PACKET_SEND], this.handlePacket))
        this.mount(this.bus.subscribe(DEVICE_ANNOUNCE, this.handleFilterUpdate));

        this.filter = filter;
    }

    get trace() {
        return this._trace;
    }

    set trace(t: Trace) {
        if (t !== this._trace) {
            this._trace = t;
            this.refreshFilter();
            this.emit(CHANGE);
        }
    }

    get filteredPackets() {
        return this._filteredPackets;
    }

    get filter() {
        return this._filter;
    }

    set filter(f: string) {
        if (f !== this._filter) {
            this._filter = f;
            this.refreshFilter();
            this.emit(CHANGE);
        }
    }

    get maxFilteredLength() {
        return this._maxFilteredLength;
    }

    set maxFilteredLength(v: number) {
        if (this._maxFilteredLength !== v) {
            this._maxFilteredLength = v;
            this.refreshFilter();
            this.emit(CHANGE);
        }
    }

    private setFilteredPackets() {
        // always clone for React
        this._filteredPackets = this._filteredPackets.slice(0, this._filteredPackets.length > this.maxFilteredLength * 1.1
            ? this.maxFilteredLength : this._filteredPackets.length)
        this.emit(CHANGE);
    }

    clear() {
        this.trace = new Trace();
        this._filteredPackets = []
        this.setFilteredPackets();
        this.emit(CHANGE);
    }

    private handleFilterUpdate() {
        this.refreshFilter();
    }

    private refreshFilter() {
        this.id = "v" + Math.random();
        this._packetFilter = parsePacketFilter(this.bus, this._filter);
        this._filteredPackets = [];
        const packets = this.trace.packets;
        // reapply filter to existing trace
        for (let i = packets.length - 1; i >= 0 && this._filteredPackets.length < this.maxFilteredLength; --i) {
            const pkt = packets[i];
            if (this._packetFilter?.filter(pkt)) {
                this.addFilteredPacket(pkt);
            }
        }
        this._filteredPackets = this._filteredPackets.reverse();
        this.notifyPacketsChanged();
    }

    private handlePacket(pkt: Packet) {
        // remember package
        this.trace.addPacket(pkt);

        // add packet to live list
        if (this._packetFilter?.filter(pkt)) {
            this.addFilteredPacket(pkt);
            // debounced notification of changes
            this.notifyPacketsChanged();
        }
    }

    private addFilteredPacket(pkt: Packet) {
        if (pkt.meta[this.id])
            return;
        pkt.meta[this.id] = true;

        // resolve packet device for pretty name
        if (!pkt.device)
            pkt.device = this.bus.device(pkt.device_identifier);

        // detect duplicate at the tail of the packets
        let key = ""
        if (this._packetFilter?.props.grouping) {
            key = pkt.toString();
            const old = this._filteredPackets
                .slice(0, DUPLICATE_PACKET_MERGE_HORIZON_MAX_DISTANCE)
                .find(p => (pkt.timestamp - p.packet.timestamp) < DUPLICATE_PACKET_MERGE_HORIZON_MAX_TIME &&
                    p.key === key)
            if (old) {
                old.count++;
                return;
            }
        }

        this._filteredPackets.unshift({
            key,
            packet: pkt,
            count: 1
        })
    }
}
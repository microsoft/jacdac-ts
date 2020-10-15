import { JDBus } from "./bus";
import { JDClient } from "./client";
import { CHANGE, DEVICE_ANNOUNCE, PACKET_PROCESS, PACKET_SEND, START, STOP } from "./constants";
import Packet from "./packet";
import { PacketFilter, parsePacketFilter } from "./packetfilter";
import Trace from "./trace";
import { throttle } from "./utils";

const FILTERED_TRACE_MAX_ITEMS = 100;
const DUPLICATE_PACKET_MERGE_HORIZON_MAX_DISTANCE = 10;
const DUPLICATE_PACKET_MERGE_HORIZON_MAX_TIME = 5000;
const RECORDING_TRACE_MAX_ITEMS = 100000;

export interface TracePacketProps {
    key: string;
    packet: Packet;
    count?: number;
}

export default class TraceRecorder extends JDClient {
    public maxRecordingLength = RECORDING_TRACE_MAX_ITEMS;
    public maxFilteredLength = FILTERED_TRACE_MAX_ITEMS;

    private _trace: Trace;
    private _recording = false;
    private _replayTrace: Trace;
    private _filter: string;
    private _packetFilter: PacketFilter = undefined;
    private _filteredPackets: TracePacketProps[] = [];
    private _paused: boolean = false;

    private notifyPacketsChanged: () => void;

    static FILTERED_PACKETS_CHANGE = "filteredPacketsChange"

    constructor(public readonly bus: JDBus, throttleDelay = 200) {
        super()
        this._trace = new Trace();
        this.handlePacket = this.handlePacket.bind(this);
        this.handleFilterUpdate = this.handleFilterUpdate.bind(this);

        this.notifyPacketsChanged = throttle(() => {
            this.setFilteredPackets();
        }, throttleDelay);

        this.mount(this.bus.subscribe(DEVICE_ANNOUNCE, this.handleFilterUpdate));
        this.mount(this.bus.subscribe([PACKET_PROCESS, PACKET_SEND], this.handlePacket));
    }

    startRecording() {
        if (this._recording) return;

        this._replayTrace = undefined;
        this._trace = new Trace();
        this._recording = true;
        this.emit(START);
        this.emit(CHANGE);
    }

    stopRecording() {
        if (!this._recording) return;

        this._replayTrace = this._trace;
        this._trace = new Trace();
        this.emit(STOP);
        this.emit(CHANGE);
    }

    get recording() {
        return this._recording;
    }

    get trace() {
        return this._trace;
    }

    get filteredPackets() {
        return this._filteredPackets;
    }

    set replayTrace(trace: Trace) {
        if (trace !== this._replayTrace) {
            if (this.recording)
                this.stopRecording();
            this._replayTrace = trace;
            this.emit(CHANGE);
        }
    }

    get filter() {
        return this._filter;
    }

    set filter(f: string) {
        if (f !== this._filter) {
            this._filter = f;
            this.refreshFilter();
        }
    }

    get paused() {
        return this._paused;
    }

    set paused(p: boolean) {
        if (this._paused !== p) {
            this._paused = p;
            this.emit(CHANGE);
        }
    }

    private setFilteredPackets() {
        // always clone for React
        this._filteredPackets = this._filteredPackets.slice(0, this._filteredPackets.length > this.maxFilteredLength * 1.1
            ? this.maxFilteredLength : this._filteredPackets.length)
        this.emit(TraceRecorder.FILTERED_PACKETS_CHANGE);
    }

    clear() {
        this.stopRecording();
        this._filteredPackets = []
        this.setFilteredPackets();
        this.emit(CHANGE);
    }

    private handleFilterUpdate() {
        this.refreshFilter();
    }

    private refreshFilter() {
        this._packetFilter = parsePacketFilter(this.bus, this._filter);
        this._filteredPackets = [];
        const packets = this.trace.packets;
        // reapply filter to existing trace
        for (let i = packets.length - 1; i >= 0 && this._filteredPackets.length < FILTERED_TRACE_MAX_ITEMS; --i) {
            const pkt = packets[i];
            if (this._packetFilter?.(pkt)) {
                this.addFilteredPacket(pkt);
            }
        }
        this._filteredPackets = this._filteredPackets.reverse();
        this.emit(TraceRecorder.FILTERED_PACKETS_CHANGE);
    }

    private handlePacket(pkt: Packet) {
        if (this.paused)
            return; // skip any processing

        // record packets in traces
        this._trace.addPacket(pkt, this.maxRecordingLength);

        // add packet to live list
        if (this._packetFilter?.(pkt)) {
            this.addFilteredPacket(pkt);
            // debounced notification of changes
            this.notifyPacketsChanged();
        }

        // notify that this packet has been processed
        this.emit(PACKET_PROCESS, pkt);
    }

    private addFilteredPacket(pkt) {
        // detect duplicate at the tail of the packets
        const key = pkt.toString();
        const old = this._filteredPackets
            .slice(0, DUPLICATE_PACKET_MERGE_HORIZON_MAX_DISTANCE)
            .find(p => (pkt.timestamp - p.packet.timestamp) < DUPLICATE_PACKET_MERGE_HORIZON_MAX_TIME &&
                p.key === key)
        if (old) {
            old.count++;
        }
        else {
            this._filteredPackets.unshift({
                key,
                packet: pkt,
                count: 1
            })
        }
    }
}
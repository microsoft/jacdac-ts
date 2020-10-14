import { JDBus } from "./bus";
import { JDClient } from "./client";
import { CHANGE, DEVICE_ANNOUNCE, PACKET_PROCESS, PACKET_SEND, START, STOP } from "./constants";
import Packet from "./packet";
import { PacketFilter, parsePacketFilter } from "./packetfilter";
import Trace from "./trace";
import { throttle } from "./utils";

const FILTERED_TRACE_MAX_ITEMS = 100;
const DUPLICATE_PACKET_MERGE_HORIZON_MAX_DISTANCE = 15;
const DUPLICATE_PACKET_MERGE_HORIZON_MAX_TIME = 10000;
const RECORDING_TRACE_MAX_ITEMS = 100000;

export interface TracePacketProps {
    key: string;
    packet: Packet;
    count?: number;
}

export default class TraceRecorder extends JDClient {
    public maxRecordingLength = RECORDING_TRACE_MAX_ITEMS;
    public maxFilteredLength = FILTERED_TRACE_MAX_ITEMS;

    private _recordingTrace: Trace;
    private _replayTrace: Trace;
    private _filter: string;
    private _packetFilter: PacketFilter = undefined;
    private _filteredPackets: TracePacketProps[] = [];
    private _paused: boolean = false;

    private notifyPacketsChanged: () => void;

    static FILTERED_PACKETS_CHANGE = "filteredPacketsChange"

    constructor(public readonly bus: JDBus, throttleDelay = 200) {
        super()
        this.handlePacket = this.handlePacket.bind(this);
        this.handleFilterUpdate = this.handleFilterUpdate.bind(this);

        this.notifyPacketsChanged = throttle(() => {
            this.setFilteredPackets();
        }, throttleDelay);

        this.mount(this.bus.subscribe(DEVICE_ANNOUNCE, this.handleFilterUpdate));
        this.mount(this.bus.subscribe([PACKET_PROCESS, PACKET_SEND], this.handlePacket));
    }

    startRecording() {
        if (this._replayTrace) return;

        this._recordingTrace = new Trace([]);
        this.emit(START);
        this.emit(CHANGE);
    }

    stopRecording() {
        if (!this._recordingTrace) return;

        this._replayTrace = this._recordingTrace;
        this._recordingTrace = undefined;
        this.emit(STOP);
        this.emit(CHANGE);
    }

    get recording() {
        return !!this._recordingTrace;
    }

    get trace() {
        return this._recordingTrace || this._replayTrace;
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
        this._filteredPackets = this._filteredPackets.filter(p => this._packetFilter(p.packet));
        this.notifyPacketsChanged();
    }

    private handlePacket(pkt: Packet) {
        if (this.paused)
            return; // skip any processing

        // record all packets if recording
        if (this._recordingTrace) {
            this._recordingTrace.packets.push(pkt)
            if (this._recordingTrace.packets.length > this.maxRecordingLength * 1.1) { // 10% overshoot of max
                this._recordingTrace.packets = this._recordingTrace.packets.slice(-this.maxRecordingLength)
            }
        }

        // add packet to live list
        if (this._packetFilter?.(pkt)) {
            // detect duplicate at the tail of the packets
            const key = pkt.toString().toString();
            const old = this._filteredPackets
                .slice(DUPLICATE_PACKET_MERGE_HORIZON_MAX_DISTANCE)
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
            // debounced notification of changes
            this.notifyPacketsChanged();
        }

        // notify that this packet has been processed
        this.emit(PACKET_PROCESS, pkt);
    }
}
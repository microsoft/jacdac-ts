import { JDBus } from "./bus";
import { JDClient } from "./client";
import { CHANGE, PROGRESS } from "./constants";
import Trace from "./trace";

export default class TracePlayer extends JDClient {
    private _trace: Trace;
    private _busStartTimestamp: number = 0;
    private _index: number = 0;
    private _interval: any;
    private _lastProgressEmit: number = 0;

    constructor(
        public readonly bus: JDBus,
        public speed: number = 1
    ) {
        super();
        this.tick = this.tick.bind(this);

        // always stop when unmounting
        this.mount(() => this.stop());
    }

    get running() {
        return !!this._interval;
    }

    get trace() {
        return this._trace;
    }

    set trace(t: Trace) {
        if (t !== this._trace) {
            this.stop();
            this._trace = t;
            this.emit(CHANGE);
        }
    }

    /**
     * Gets the adjusted timestamp
     */
    get elapsed() {
        return (this.bus.timestamp - this._busStartTimestamp) * this.speed;
    }

    get progress() {
        if (!this.trace)
            return 0;
        return Math.max(0, Math.min(
            1,
            this.elapsed / this.trace.duration
        ));
    }

    get length() {
        return this.trace?.length || 0;
    }

    start() {
        if (this._interval || !this._trace) return; // already running

        // this is the reference start time of this run
        this._busStartTimestamp = this.bus.timestamp;
        this._index = 0;
        this._interval = setInterval(this.tick, 50);
        this.emit(CHANGE);
        this.emitProgress(true);
    }

    stop() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = undefined;
            this.emitProgress(true);
            this.emit(CHANGE);
        }
    }

    private tick() {
        if (!this._trace)
            return;

        const busElapsed = this.elapsed;
        const packets = this.trace.packets;
        const packetStart = packets[0]?.timestamp || 0;

        let nframes = 0;
        let npackets = 0;

        while (this._index < packets.length) {
            const packet = packets[this._index];
            const packetElapsed = packet.timestamp - packetStart;
            if (packetElapsed > busElapsed)
                break; // wait to catch up
            // clone packet and send
            const pkt = packet.clone();
            pkt.timestamp = this._busStartTimestamp + packetElapsed;
            this.bus.processPacket(pkt)
            this._index++;
            nframes++;
        }

        //console.log(`replay ${this._index} ${nframes} frames, ${npackets} packets`)
        this.emitProgress();
        if (this._index >= packets.length)
            this.stop();
    }

    private emitProgress(force?: boolean) {
        if (force || (this.bus.timestamp - this._lastProgressEmit) > 250) {
            this.emit(PROGRESS, this.progress);
            this._lastProgressEmit = this.bus.timestamp;
        }
    }
}
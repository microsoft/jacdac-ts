import { JDBus } from "./bus";
import { CHANGE, PROGRESS } from "./constants";
import { JDEventSource } from "./eventsource";
import Packet from "./packet";

export default class TracePlayer extends JDEventSource {
    private _busStartTimestamp: number = 0;
    private _index: number = 0;
    private _interval: any;
    private _lastProgressEmit: number = 0;

    constructor(
        public readonly bus: JDBus,
        public readonly packets: Packet[],
        public speed: number = 1
    ) {
        super();
        this.tick = this.tick.bind(this);
    }

    get running() {
        return !!this._interval;
    }

    /**
     * Gets the adjusted timestamp
     */
    get elapsed() {
        return (this.bus.timestamp - this._busStartTimestamp) * this.speed;
    }

    get duration() {
        return this.packets[this.packets.length - 1].timestamp - this.packets[0].timestamp;
    }

    get progress() {
        return Math.max(0, Math.min(
            1,
            this.elapsed / this.duration
        ));
    }

    get length() {
        return this.packets.length;
    }

    start() {
        if (this._interval) return; // already running

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
        const busElapsed = this.elapsed;
        const packetStart = this.packets[0].timestamp;

        let nframes = 0;
        let npackets = 0;

        while (this._index < this.packets.length) {
            const packet = this.packets[this._index];
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

        console.log(`replay ${this._index} ${nframes} frames, ${npackets} packets`)
        this.emitProgress();
        if (this._index >= this.packets.length)
            this.stop();
    }

    private emitProgress(force?: boolean) {
        if (force || (this.bus.timestamp - this._lastProgressEmit) > 250) {
            this.emit(PROGRESS, this.progress);
            this._lastProgressEmit = this.bus.timestamp;
        }
    }
}
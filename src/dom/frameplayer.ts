import { JDBus } from "./bus";
import { CHANGE, FRAME_PROCESS, PROGRESS } from "./constants";
import { JDEventSource } from "./eventsource";
import Frame from "./frame";
import Packet from "./packet";
import { debounce } from "./utils";

export default class FramePlayer extends JDEventSource {
    private _busStartTimestamp: number = 0;
    private _frameIndex: number = 0;
    private _interval: any;
    private _lastProgressEmit: number = 0;

    constructor(
        public readonly bus: JDBus,
        public readonly frames: Frame[],
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

    get progress() {
        return this._frameIndex / this.frames.length
    }

    start() {
        if (this._interval) return; // already running

        // this is the reference start time of this run
        this._busStartTimestamp = this.bus.timestamp;
        this._frameIndex = 0;
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
        const frameStart = this.frames[0].timestamp;
        while (this._frameIndex < this.frames.length) {
            const frame = this.frames[this._frameIndex];
            const frameElapsed = frame.timestamp - frameStart;
            if (frameElapsed > busElapsed)
                break; // wait to catch up
            this.emit(FRAME_PROCESS, frame);
            const t = this._busStartTimestamp + frameElapsed;
            for (const p of Packet.fromFrame(frame.data, t)) {
                this.bus.processPacket(p)
            }
            this._frameIndex++;
        }
        this.emitProgress();
        if (this._frameIndex >= this.frames.length)
            this.stop();
    }

    private emitProgress(force?: boolean) {
        if (force || (this.bus.timestamp - this._lastProgressEmit) > 250) {
            this.emit(PROGRESS, this.progress);
            this._lastProgressEmit = this.bus.timestamp;
        }
    }
}
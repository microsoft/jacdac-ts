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

    constructor(
        public readonly bus: JDBus,
        public readonly frames: Frame[],
        public speed: number = 1) {
        super();
        this.tick = this.tick.bind(this);
        this.emitProgress = debounce(this.emitProgress.bind(this), 100)
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

    start() {
        if (this._interval) return; // already running

        // this is the reference start time of this run
        this._busStartTimestamp = this.bus.timestamp;
        this._frameIndex = 0;
        this._interval = setInterval(this.tick, 10);
        this.emit(CHANGE);
        this.emitProgress();
    }

    stop() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = undefined;
            this.emitProgress();
            this.emit(CHANGE);
        }
    }

    private tick() {
        const busElapsed = this.elapsed;
        while (this._frameIndex < this.frames.length) {
            const frame = this.frames[this._frameIndex];
            const frameElapsed = (frame.timestamp - this.frames[0].timestamp);
            if (frameElapsed > busElapsed)
                break; // wait to catch up
            this.emit(FRAME_PROCESS, frame);
            for (const p of Packet.fromFrame(frame.data, frame.timestamp)) {
                this.bus.processPacket(p)
            }
            this._frameIndex++;
        }
        if (this._frameIndex >= this.frames.length)
            this.stop();
    }

    private emitProgress() {
        this.emit(PROGRESS, this._frameIndex / this.frames.length);
    }
}
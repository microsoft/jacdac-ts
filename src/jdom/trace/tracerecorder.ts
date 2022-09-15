import { JDBus } from "../bus"
import { JDClient } from "../client"
import { CHANGE, FRAME_PROCESS, FRAME_SEND, START, STOP } from "../constants"
import { JDFrameBuffer } from "../packet"
import { Trace } from "./trace"

const RECORDING_TRACE_MAX_ITEMS = 100000

/**
 * A recorder of packets to create traces.
 * @category Trace
 */
export class TraceRecorder extends JDClient {
    public maxRecordingLength = RECORDING_TRACE_MAX_ITEMS
    private _trace: Trace
    private _subscription: () => void

    constructor(public readonly bus: JDBus) {
        super()
        this.handleFrame = this.handleFrame.bind(this)

        this.mount(() => this._subscription?.())
    }

    start() {
        if (this.recording) return

        this._subscription = this.bus.subscribe(
            [FRAME_PROCESS, FRAME_SEND],
            this.handleFrame
        )
        this._trace = new Trace([], { maxLength: this.maxRecordingLength })
        this.emit(START)
        this.emit(CHANGE)
    }

    stop() {
        if (!this.recording) return

        this._subscription?.()
        this._subscription = undefined
        const t = this._trace
        this._trace = undefined
        this.emit(STOP)
        this.emit(CHANGE)

        return t
    }

    get recording() {
        return !!this._trace
    }

    get trace() {
        return this._trace
    }

    private handleFrame(pkt: JDFrameBuffer) {
        // record packets in traces
        this._trace.addFrame(pkt)
        // notify that this packet has been processed
        this.emit(FRAME_PROCESS, pkt)
    }
}


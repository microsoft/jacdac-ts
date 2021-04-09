import { JDBus } from "./bus"
import { JDClient } from "./client"
import { CHANGE, PACKET_PROCESS, PACKET_SEND, START, STOP } from "./constants"
import Packet from "./packet"
import Trace from "./trace"

const RECORDING_TRACE_MAX_ITEMS = 100000
export default class TraceRecorder extends JDClient {
    public maxRecordingLength = RECORDING_TRACE_MAX_ITEMS
    private _trace: Trace

    constructor(public readonly bus: JDBus) {
        super()
        this.handlePacket = this.handlePacket.bind(this)

        this.mount(
            this.bus.subscribe([PACKET_PROCESS, PACKET_SEND], this.handlePacket)
        )
    }

    start() {
        if (this.recording) return

        this._trace = new Trace()
        this.emit(START)
        this.emit(CHANGE)
    }

    stop() {
        if (!this.recording) return

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

    private handlePacket(pkt: Packet) {
        if (!this.recording) return

        // record packets in traces
        this._trace.addPacket(pkt, this.maxRecordingLength)
        // notify that this packet has been processed
        this.emit(PACKET_PROCESS, pkt)
    }
}

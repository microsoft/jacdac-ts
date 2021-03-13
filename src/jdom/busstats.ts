import { JDBus } from "./bus"
import { CHANGE, PACKET_PROCESS, PACKET_SEND, SELF_ANNOUNCE } from "./constants"
import { JDEventSource } from "./eventsource"
import Packet from "./packet"

export interface BusStats {
    packets: number
    announce: number
    acks: number
    bytes: number
}

export class BusStatsMonitor extends JDEventSource {
    private readonly _prev: BusStats[] = Array(10)
        .fill(0)
        .map(() => ({
            packets: 0,
            announce: 0,
            acks: 0,
            bytes: 0,
        }))
    private _previ = 0
    private _temp: BusStats = {
        packets: 0,
        announce: 0,
        acks: 0,
        bytes: 0,
    }

    constructor(readonly bus: JDBus) {
        super()
        this.bus.on(PACKET_SEND, this.handlePacketSend.bind(this))
        this.bus.on(PACKET_PROCESS, this.handlePacketProcess.bind(this))
        this.bus.on(SELF_ANNOUNCE, this.handleSelfAnnounce.bind(this))
    }

    get current(): BusStats {
        const r: BusStats = {
            packets: 0,
            announce: 0,
            acks: 0,
            bytes: 0,
        }
        const n = this._prev.length
        for (let i = 0; i < this._prev.length; ++i) {
            const p = this._prev[i]
            r.packets += p.packets
            r.announce += p.announce
            r.acks += p.acks
            r.bytes += p.bytes
        }
        // announce every 500ms
        const n2 = n / 2
        r.packets /= n2
        r.announce /= n2
        r.acks /= n2
        r.bytes /= n2
        return r
    }

    private accumulate(pkt: Packet) {
        this._temp.packets++
        this._temp.bytes += (pkt.header?.length || 0) + (pkt.data?.length || 0)
        if (pkt.isCRCAck) this._temp.acks++
    }

    private handleSelfAnnounce() {
        const changed =
            JSON.stringify(this._prev) !== JSON.stringify(this._temp)
        this._prev[this._previ] = this._temp
        this._previ = (this._previ + 1) % this._prev.length
        this._temp = {
            packets: 0,
            announce: 0,
            acks: 0,
            bytes: 0,
        }
        if (changed) this.emit(CHANGE)
    }

    private handlePacketSend(pkt: Packet) {
        this.accumulate(pkt)
    }

    private handlePacketProcess(pkt: Packet) {
        this.accumulate(pkt)
    }
}

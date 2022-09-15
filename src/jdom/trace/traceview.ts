import { JDBus } from "../bus"
import { JDClient } from "../client"
import {
    CHANGE,
    DEVICE_ANNOUNCE,
    FRAME_PROCESS,
    FRAME_SEND,
    META_ACK,
    META_GET,
    META_NOT_IMPLEMENTED,
    META_PIPE,
    PACKET_PROCESS,
    PACKET_SEND,
    SystemCmd,
    TRACE_FILTER_HORIZON,
} from "../constants"
import { JDFrameBuffer, Packet } from "../packet"
import { PacketFilter, parsePacketFilter } from "../packetfilter"
import { Trace } from "./trace"
import { throttle, toHex } from "../utils"

const TRACE_MAX_ITEMS = 1000
const FILTERED_TRACE_MAX_ITEMS = 100
const DUPLICATE_PACKET_MERGE_HORIZON_MAX_DISTANCE = 10
const DUPLICATE_PACKET_MERGE_HORIZON_MAX_TIME = 5000

/**
 * A grouped packet
 * @category Trace
 */
export interface TracePacketProps {
    /**
     * Unique key used for React lists
     */
    key: string
    /**
     * Identifier to match packets together
     */
    hash: string
    /**
     * The packet
     */
    packet: Packet
    count?: number
}

/**
 * A filtered view over a packet trace
 * @category Trace
 */
export class TraceView extends JDClient {
    private id = "v" + Math.random()
    private _maxFilteredLength = FILTERED_TRACE_MAX_ITEMS

    private _paused = false
    private _trace: Trace
    private _filter: string
    private _packetFilter: PacketFilter = undefined
    private _filteredPackets: TracePacketProps[] = []
    private _allPackets: Packet[] = []

    public silent = false
    private notifyPacketsChanged: () => void

    constructor(
        public readonly bus: JDBus,
        filter: string,
        throttleDelay = 200
    ) {
        super()
        this._trace = new Trace([], { maxLength: TRACE_MAX_ITEMS })
        this.handleFrame = this.handleFrame.bind(this)
        this.handlePacket = this.handlePacket.bind(this)
        this.handleFilterUpdate = this.handleFilterUpdate.bind(this)

        this.notifyPacketsChanged = throttle(() => {
            if (!this.silent) this.setFilteredPackets()
        }, throttleDelay)

        this.mount(
            this.bus.subscribe([FRAME_PROCESS, FRAME_SEND], this.handleFrame)
        )
        this.mount(
            this.bus.subscribe([PACKET_PROCESS, PACKET_SEND], this.handlePacket)
        )
        this.mount(this.bus.subscribe(DEVICE_ANNOUNCE, this.handleFilterUpdate))

        this.filter = filter
    }

    /**
     * No new packet is added to the filtered view
     */
    get paused() {
        return this._paused
    }

    set paused(v: boolean) {
        if (v !== this._paused) {
            this._paused = v
            if (!this._paused) {
                this.refreshFilter()
                this.emit(CHANGE)
            }
        }
    }

    get trace() {
        return this._trace
    }

    set trace(t: Trace) {
        if (t !== this._trace) {
            this._trace = t
            this._allPackets = t.toPackets(this.bus)
            this.refreshFilter()
            this.emit(CHANGE)
        }
    }

    get filteredPackets() {
        return this._filteredPackets
    }

    get filter() {
        return this._filter
    }

    set filter(f: string) {
        if (f !== this._filter) {
            this._filter = f
            this.refreshFilter()
            this.emit(CHANGE)
        }
    }

    get maxFilteredLength() {
        return this._maxFilteredLength
    }

    set maxFilteredLength(v: number) {
        if (this._maxFilteredLength !== v) {
            this._maxFilteredLength = v
            this.refreshFilter()
            this.emit(CHANGE)
        }
    }

    private setFilteredPackets() {
        // always clone for React
        this._filteredPackets = this._filteredPackets.slice(
            0,
            this._filteredPackets.length > this.maxFilteredLength * 1.1
                ? this.maxFilteredLength
                : this._filteredPackets.length
        )
        this.emit(CHANGE)
    }

    clear() {
        this.trace = new Trace([], { maxLength: TRACE_MAX_ITEMS })
        this._filteredPackets = []
        this.setFilteredPackets()
        this.emit(CHANGE)
    }

    private handleFilterUpdate() {
        this.refreshFilter()
    }

    private refreshFilter() {
        this.id = "view" + Math.random()
        this._packetFilter = parsePacketFilter(this.bus, this._filter)
        this._filteredPackets = []
        const packets = this._allPackets
        // reapply filter to existing trace
        for (
            let i = packets.length - 1;
            i >= 0 && this._filteredPackets.length < this.maxFilteredLength;
            --i
        ) {
            const pkt = packets[i]
            if (this._packetFilter?.filter(pkt)) {
                this.addFilteredPacket(pkt)
            }
        }
        this._filteredPackets = this._filteredPackets.reverse()
        this.notifyPacketsChanged?.()
    }

    private handlePacket(pkt: Packet) {
        if (this._paused) return
        this._allPackets.push(pkt)
        if (this._allPackets.length > TRACE_MAX_ITEMS * 1.5)
            this._allPackets = this._allPackets.slice(-TRACE_MAX_ITEMS)
        // add packet to live list
        if (this._packetFilter?.filter(pkt)) {
            this.addFilteredPacket(pkt)
            // debounced notification of changes
            this.notifyPacketsChanged?.()
        }
    }

    private handleFrame(frame: JDFrameBuffer) {
        if (this._paused) return
        // remember packet
        this._trace.addFrame(frame)
    }

    private addFilteredPacket(packet: Packet) {
        if (packet.meta[this.id]) return
        packet.meta[this.id] = true

        // keep in filtered view
        let filtered = true
        const hash = toHex(packet.toBuffer())
        if (this._packetFilter?.props.grouping) {
            const old = this._filteredPackets
                .slice(0, DUPLICATE_PACKET_MERGE_HORIZON_MAX_DISTANCE)
                .find(
                    p =>
                        packet.timestamp - p.packet.timestamp <
                            DUPLICATE_PACKET_MERGE_HORIZON_MAX_TIME &&
                        p.hash === hash
                )
            if (old) {
                old.count++
                filtered = false
            }
        }

        // collapse acks
        if (packet.isCRCAck) {
            const pkts = this._allPackets
            const crc = packet.serviceCommand
            const did = packet.deviceIdentifier
            const m = Math.max(0, pkts.length - TRACE_FILTER_HORIZON) // max scan 100 packets back
            for (let i = pkts.length - 1; i >= m; i--) {
                const old = pkts[i]
                if (
                    old.requiresAck &&
                    old.deviceIdentifier === did &&
                    old.crc === crc
                ) {
                    old.meta[META_ACK] = packet
                    if (this._packetFilter?.props.collapseAck) filtered = false
                    break
                }
            }
        }

        // track command not supported
        if (packet.serviceCommand === SystemCmd.CommandNotImplemented) {
            const pkts = this._allPackets
            const [sc, crc] = packet.jdunpack<[number, number]>("u16 u16")
            const m = Math.max(0, pkts.length - TRACE_FILTER_HORIZON) // max scan 100 packets back
            for (let i = pkts.length - 1; i >= m; i--) {
                const old = pkts[i]
                if (old.crc === crc && old.serviceCommand === sc) {
                    old.meta[META_NOT_IMPLEMENTED] = packet
                    if (this._packetFilter?.props.collapseNotImplemented)
                        filtered = false
                    break
                }
            }
        }

        // report coming back
        if (packet.isRegisterGet && packet.isReport && !packet.meta[META_GET]) {
            const pkts = this._allPackets
            const did = packet.deviceIdentifier
            const si = packet.serviceIndex
            const rid = packet.registerIdentifier
            const m = Math.max(0, pkts.length - TRACE_FILTER_HORIZON) // max scan 100 packets back
            for (let i = pkts.length - 1; i >= m; i--) {
                const old = pkts[i]
                if (
                    old.isRegisterGet &&
                    old.isCommand &&
                    old.deviceIdentifier === did &&
                    old.serviceIndex === si &&
                    old.registerIdentifier === rid
                ) {
                    // response from a get command
                    packet.meta[META_GET] = old
                    if (this._packetFilter?.props.collapseGets) {
                        // remove old
                        this._filteredPackets.splice(i, 1)
                        // keep new
                    }
                    break
                }
            }
        }
        // collapse pipes
        if (
            this._packetFilter?.props.collapsePipes &&
            packet.isPipe &&
            packet.isCommand
        ) {
            const pkts = this._filteredPackets
            const m = Math.min(pkts.length, TRACE_FILTER_HORIZON) // max scan 100 packets back
            const port = packet.pipePort
            const did = packet.deviceIdentifier
            for (let i = 0; i < m; ++i) {
                const old = pkts[i].packet
                if (old.deviceIdentifier === did && old.pipePort === port) {
                    let pipePackets = old.meta[META_PIPE] as Packet[]
                    if (!pipePackets) pipePackets = old.meta[META_PIPE] = []
                    pipePackets[packet.pipeCount] = packet
                    filtered = false
                    break
                }
            }
        }

        if (filtered) {
            const key = packet.timestamp + hash
            this._filteredPackets.unshift({
                key,
                hash,
                packet,
                count: 1,
            })
        }
    }
}

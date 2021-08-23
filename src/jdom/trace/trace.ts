import Packet from "../packet"
import { printPacket } from "../pretty"
import { toHex } from "../utils"

const TRACE_OVERSHOOT = 1.1

/**
 * A sequence of packets.
 * @category Trace
 */
export class Trace {
    /**
     * Constructs a new empty trace or from an existing list of packets
     * @param packets list of packets
     * @param description description of the trace
     */
    constructor(public packets: Packet[] = [], public description?: string) {}

    /**
     * Number of packets in trace
     */
    get length() {
        return this.packets.length
    }

    /**
     * Duration in milliseconds between the first and last packet.
     */
    get duration() {
        if (!this.packets.length) return 0
        return (
            this.packets[this.packets.length - 1].timestamp -
            this.packets[0].timestamp
        )
    }

    /**
     * Timestamp of the first packet, defaults to 0 if trace is empty.
     */
    get startTimestamp() {
        return this.packets[0]?.timestamp || 0
    }

    /**
     * Timestamp of the last packet, defaults to 0 if trace is empty.
     */
    get endTimestamp() {
        return this.packets[this.packets.length - 1]?.timestamp || 0
    }

    /**
     * Appends a packet to the trace
     * @param packet packet to add
     * @param maxLength If positive, prunes older packets when the length reaches maxLength
     */
    addPacket(packet: Packet, maxLength = -1) {
        this.packets.push(packet)
        if (
            maxLength > 0 &&
            this.packets.length > maxLength * TRACE_OVERSHOOT
        ) {
            // 10% overshoot of max
            this.packets = this.packets.slice(-maxLength)
        }
    }

    /**
     * Gets a text-rendered view of the trace
     * @returns text where each line is a packet
     */
    serializeToText() {
        const start = this.packets[0]?.timestamp || 0
        const text = this.packets.map(
            pkt =>
                `${pkt.timestamp - start}\t${toHex(
                    pkt.toBuffer()
                )}\t${printPacket(pkt, {}).replace(/\r?\n/g, " ")}`
        )
        if (this.description) {
            text.unshift(this.description)
            text.unshift("")
        }
        return text.join("\n")
    }
}
export default Trace

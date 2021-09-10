import { META_TRACE } from "../constants"
import Packet from "../packet"
import { printPacket } from "../pretty"
import { roundWithPrecision, toHex } from "../utils"

const TRACE_OVERSHOOT = 1.1

/**
 * Collect stack trace at the current execution position
 * @returns
 * @internal
 */
export function stack() {
    return new Error().stack
}

/**
 * @internal
 */
export function cleanStack(text: string) {
    return text
        ?.split(/\n/g)
        .slice(2)
        .join("\n") // drop first 2 lines
        .replace(/webpack-internal:\/\/\//g, "")
        .replace(/https:\/\/microsoft\.github\.io\/jacdac-docs/g, "")
}

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
     * @param length maximum number of elements
     * @returns text where each line is a packet
     */
    serializeToText(length?: number) {
        const start = this.packets[0]?.timestamp || 0
        let pkts = this.packets
        if (length > 0) pkts = pkts.slice(-length)
        const text = pkts.map(pkt => {
            let t = `${roundWithPrecision(pkt.timestamp - start, 3)}\t${toHex(
                pkt.toBuffer()
            )}\t${printPacket(pkt, {}).replace(/\r?\n/g, " ")}`
            const trace = pkt.meta[META_TRACE] as string
            if (trace) t += "\n" + cleanStack(trace)
            return t
        })
        if (this.description) {
            text.unshift(this.description)
            text.unshift("")
        }
        return text.join("\n")
    }
}
export default Trace

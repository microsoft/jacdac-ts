import { JDBus } from "../bus"
import { META_TRACE, META_TRACE_DESCRIPTION } from "../constants"
import { Packet } from "../packet"
import { printPacket } from "../pretty"
import { randomDeviceId } from "../random"
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

export function serializeToTrace(pkt: Packet, start?: number) {
    const data = toHex(pkt.toBuffer()).padEnd(84, " ")
    const t = roundWithPrecision(pkt.timestamp - (start || 0), 3)
    const descr =
        pkt.meta[META_TRACE_DESCRIPTION] ||
        printPacket(pkt, {}).replace(/\r?\n/g, " ")
    let msg = `${t}\t${data}\t${descr}`
    const trace = pkt.meta[META_TRACE] as string
    if (trace) msg += "\n" + cleanStack(trace)
    return msg
}

/**
 * A sequence of packets.
 * @category Trace
 */
export class Trace {
    readonly id = randomDeviceId()
    readonly maxLength: number
    readonly description: string
    /**
     * Constructs a new empty trace or from an existing list of packets
     * @param packets list of packets
     * @param description description of the trace
     */
    constructor(
        public packets: Packet[] = [],
        options?: {
            description?: string
            maxLength?: number
        }
    ) {
        this.description = options?.description
        this.maxLength = options?.maxLength
    }

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
    addPacket(packet: Packet) {
        // our event tracing may end up registering the same
        // packet twice when it is received and transmitted
        if (packet.meta[this.id]) {
            // console.trace("packet added twice", { packet })
            return
        }
        // keep track of trace added
        packet.meta[this.id] = true
        // packets are mutable (eg., timestamp is updated on each send), so we take a copy
        const copy = packet.clone()
        copy.sender = packet.sender
        copy.device = packet.device
        // TODO need to copy 'meta' as well?
        this.packets.push(copy)

        // limit trace size
        if (
            this.maxLength > 0 &&
            this.packets.length > this.maxLength * TRACE_OVERSHOOT
        ) {
            // 10% overshoot of max
            this.packets = this.packets.slice(-this.maxLength)
        }
    }

    /**
     * Gets a text-rendered view of the trace
     * @param length maximum number of elements
     * @returns text where each line is a packet
     */
    serializeToText(length?: number) {
        const start = this.startTimestamp
        let pkts = this.packets
        if (length > 0) pkts = pkts.slice(-length)
        const text = pkts.map(pkt => serializeToTrace(pkt, start))
        if (this.description) {
            text.unshift(this.description)
            text.unshift("")
        }
        return text.join("\n")
    }

    resolveDevices(bus: JDBus) {
        this.packets.filter(pkt => !pkt.device)
            .forEach(pkt => pkt.assignDevice(bus));
    }
}


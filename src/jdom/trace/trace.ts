import { JDBus } from "../bus"
import { META_TRACE, META_TRACE_DESCRIPTION } from "../constants"
import { JDFrameBuffer, Packet } from "../packet"
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

export function serializeToTrace(
    frame: JDFrameBuffer,
    start?: number,
    bus?: JDBus
) {
    const data = toHex(frame).padEnd(84, " ")
    let t = roundWithPrecision(
        (frame._jacdac_timestamp || 0) - (start || 0),
        3
    ).toString()
    while (t.length < 7) t += " "
    let descr = frame._jacdac_meta?.[META_TRACE_DESCRIPTION]
    if (!descr) {
        descr = Packet.fromFrame(frame, undefined, true)
            .map(pkt => {
                if (bus) pkt.assignDevice(bus)
                return printPacket(pkt, {}).replace(/\r?\n/g, " ")
            })
            .join(" ;; ")
    }
    let msg = `${t}\t${data}\t${descr}`
    const trace = frame._jacdac_meta?.[META_TRACE] as string
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
    private resolutionBus: JDBus

    /**
     * Constructs a new empty trace or from an existing list of packets
     * @param frames list of frames/packets
     * @param description description of the trace
     */
    constructor(
        public frames: JDFrameBuffer[] = [],
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
        return this.frames.length
    }

    /**
     * Duration in milliseconds between the first and last packet.
     */
    get duration() {
        if (!this.frames.length) return 0
        return (
            this.frames[this.frames.length - 1]._jacdac_timestamp -
            this.frames[0]._jacdac_timestamp
        )
    }

    /**
     * _jacdac_timestamp of the first packet, defaults to 0 if trace is empty.
     */
    get startTimestamp() {
        return this.frames[0]?._jacdac_timestamp || 0
    }

    /**
     * _jacdac_timestamp of the last packet, defaults to 0 if trace is empty.
     */
    get endTimestamp() {
        return this.frames[this.frames.length - 1]?._jacdac_timestamp || 0
    }

    /**
     * Appends a frame to the trace
     * @param frame frame/packet to add
     */
    addFrame(frame: JDFrameBuffer) {
        if (!frame._jacdac_meta) frame._jacdac_meta = {}

        // our event tracing may end up registering the same
        // packet twice when it is received and transmitted
        if (frame._jacdac_meta[this.id]) {
            // console.trace("packet added twice", { packet })
            return
        }
        // keep track of trace added
        frame._jacdac_meta[this.id] = true
        // packets are mutable (eg., _jacdac_timestamp is updated on each send), so we take a copy
        const copy = frame.slice() as JDFrameBuffer
        copy._jacdac_sender = frame._jacdac_sender
        copy._jacdac_timestamp = frame._jacdac_timestamp
        // TODO need to copy 'meta' as well?
        this.frames.push(copy)

        // limit trace size
        if (
            this.maxLength > 0 &&
            this.frames.length > this.maxLength * TRACE_OVERSHOOT
        ) {
            // 10% overshoot of max
            this.frames = this.frames.slice(-this.maxLength)
        }
    }

    /**
     * Gets a text-rendered view of the trace
     * @param length maximum number of elements
     * @returns text where each line is a packet
     */
    serializeToText(length?: number) {
        const start = this.startTimestamp
        let pkts = this.frames
        if (length > 0) pkts = pkts.slice(-length)
        const text = pkts.map(pkt =>
            serializeToTrace(pkt, start, this.resolutionBus)
        )
        if (this.description) {
            text.unshift(this.description)
            text.unshift("")
        }
        return text.join("\n")
    }

    resolveDevices(bus: JDBus) {
        this.resolutionBus = bus
    }

    toPackets(bus?: JDBus) {
        const res: Packet[] = []
        for (const frame of this.frames)
            for (const pkt of Packet.fromFrame(frame, undefined, true)) {
                if (bus) pkt.assignDevice(bus)
                res.push(pkt)
            }
        return res
    }
}

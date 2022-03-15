import { arrayConcatMany, fromHex } from "./utils"
import { JDBus } from "./bus"
import { Packet } from "./packet"
import { TracePlayer } from "./trace/traceplayer"
import { Frame } from "./frame"
import { Trace } from "./trace/trace"
import { META_TRACE, META_TRACE_DESCRIPTION } from "./constants"

/**
 * Parse a trace text file
 * @param contents
 * @returns
 * @category Trace
 */
export function parseTrace(contents: string): Trace {
    const description: string[] = []
    const packets: Packet[] = []
    contents?.split(/\r?\n/).forEach(ln => {
        // parse data
        const m = /^(\d+.?\d*)\s+([a-f0-9]{12,})/i.exec(ln)
        if (!m) {
            // might be a stack trace
            if (/^\s+at\s/.test(ln)) {
                const lastPacket = packets[packets.length - 1]
                if (lastPacket) {
                    let trace = (lastPacket.meta[META_TRACE] as string) || ""
                    trace += ln + "\n"
                    lastPacket.meta[META_TRACE] = trace
                }
            } else {
                // probably junk data
                if (packets.length == 0) description.push(ln)
            }
            return
        }

        const timestamp = parseInt(m[1])
        const data = fromHex(m[2])
        // add to array
        const pkt = Packet.fromBinary(data, timestamp)
        pkt.meta[META_TRACE_DESCRIPTION] = ln.substring(m[0].length).trim()
        packets.push(pkt)
    })
    if (packets.length)
        return new Trace(packets, {
            description: description.join("\n").trim(),
        })
    else return undefined
}

/**
 * Parses a logic analyzer log into a trace
 * @param logcontents
 * @returns
 * @category Trace
 */
export function parseLogicLog(logcontents: string): Frame[] {
    if (!logcontents) return undefined

    const res: Frame[] = []
    let frameBytes = []
    let lastTime = 0
    for (const ln of logcontents.split(/\r?\n/)) {
        let m = /^JD (\d+) ([0-9a-f]+)/i.exec(ln)
        if (m) {
            res.push({
                timestamp: parseInt(m[1]),
                data: fromHex(m[2]),
            })
            continue
        }

        // this is format of trace.jd.txt file saved from website
        m = /^([\d\.]+)\s+([0-9a-f]{32,512})\s+/i.exec(ln)
        if (m) {
            res.push({
                timestamp: parseFloat(m[1]) | 0,
                data: fromHex(m[2]),
            })
            continue
        }

        /** Windows, logic 1.*
Time [s],Value,Parity Error,Framing Error
0.042909760000000,0x00,,Error
0.042980320000000,0xD4,,
...
0.043240160000000,0x27,,
0.043250080000000,0x1F,,
0.043264800000000,0x00,,Error
0.063968960000000,0x00,,Error
         */
        m = /^([\d.]+),(?:Async Serial,)?.*(0x[A-F0-9][A-F0-9])/.exec(ln)
        if (!m) continue
        const tm = parseFloat(m[1])
        if (lastTime && tm - lastTime > 0.1) {
            res.push({
                timestamp: lastTime * 1000,
                data: new Uint8Array(frameBytes),
                info: "timeout",
            })
            frameBytes = []
            lastTime = 0
        }

        lastTime = tm
        if (/(framing error|Error)/.test(ln)) {
            if (frameBytes.length > 0)
                res.push({
                    timestamp: lastTime * 1000,
                    data: new Uint8Array(frameBytes),
                })
            frameBytes = []
            lastTime = 0
        } else {
            frameBytes.push(parseInt(m[2]))
        }
    }

    return res
}

/**
 * Replays a parsed logic log
 * @param bus
 * @param frames
 * @param speed
 * @category Trace
 */
export function replayLogicLog(
    bus: JDBus,
    frames: Frame[],
    speed?: number
): void {
    const packets = arrayConcatMany(
        frames.map(frame => Packet.fromFrame(frame.data, frame.timestamp))
    )
    const player = new TracePlayer(bus, speed)
    player.trace = new Trace(packets)
    bus.clear(packets[0].timestamp)
    player.start()
}

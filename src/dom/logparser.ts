import { arrayConcatMany, fromHex } from "./utils"
import { JDBus } from "./bus"
import Packet from "./packet"
import TracePlayer from "./traceplayer"
import Frame from "./frame"
import { TRACE_FILE_LINE_HEADER } from "./constants"
import Trace from "./trace"

export function parseTrace(contents: string): Trace {
    let foundHeader = false;
    let packets: Packet[] = []
    contents?.split(/\r?\n/).forEach(ln => {
        // look for header first
        if (!foundHeader) {
            if (ln === TRACE_FILE_LINE_HEADER)
                foundHeader = true;
            return;
        }
        // parse data
        const m = /(\d+)\s+([a-f0-9]{12,})/i.exec(ln)
        if (!m) // probably junk data
            return;

        const timestamp = parseInt(m[1])
        const data = fromHex(m[2])
        // add to array
        packets.push(Packet.fromBinary(data, timestamp))
    });
    if (foundHeader)
        return new Trace(packets);
    else
        return undefined;
}

export function parseLogicLog(logcontents: string): Frame[] {
    if (!logcontents) return undefined

    const res: Frame[] = []
    let frameBytes = []
    let lastTime = 0
    for (let ln of logcontents.split(/\r?\n/)) {
        let m = /^JD (\d+) ([0-9a-f]+)/i.exec(ln)
        if (m) {
            res.push({
                timestamp: parseInt(m[1]),
                data: fromHex(m[2])
            })
            continue
        }

        /** Windows, logic 1.*
Time [s],Value,Parity Error,Framing Error
0.042909760000000,0x00,,Error
0.042980320000000,0xD4,,
0.042990240000000,0x81,,
0.043000160000000,0x10,,
0.043010240000000,0x00,,
0.043020160000000,0xE8,,
0.043030240000000,0xDF,,
0.043040160000000,0xCB,,
0.043050240000000,0xD1,,
0.043060160000000,0x97,,
0.043070240000000,0x34,,
0.043080160000000,0x37,,
0.043090240000000,0x48,,
0.043100160000000,0x0C,,
0.043110080000000,0x00,,
0.043120160000000,0x00,,
0.043130080000000,0x00,,
0.043140160000000,0x00,,
0.043150080000000,0x00,,
0.043160160000000,0x00,,
0.043170080000000,0x00,,
0.043180160000000,0xCA,,
0.043190080000000,0x1F,,
0.043200160000000,0xDC,,
0.043210080000000,0x12,,
0.043220160000000,0x46,,
0.043230080000000,0x47,,
0.043240160000000,0x27,,
0.043250080000000,0x1F,,
0.043264800000000,0x00,,Error
0.063968960000000,0x00,,Error
         */
        m = /^([\d\.]+),(?:Async Serial,)?.*(0x[A-F0-9][A-F0-9])/.exec(ln)
        if (!m)
            continue
        const tm = parseFloat(m[1])
        if (lastTime && tm - lastTime > 0.1) {
            res.push({
                timestamp: lastTime * 1000,
                data: new Uint8Array(frameBytes),
                info: "timeout"
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

export function replayLog(bus: JDBus, frames: Frame[], speed?: number): void {
    const packets = arrayConcatMany(frames.map(frame => Packet.fromFrame(frame.data, frame.timestamp)))
    const player = new TracePlayer(bus, speed);
    player.trace = new Trace(packets);
    player.start();
}

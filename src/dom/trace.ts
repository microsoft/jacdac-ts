import { TRACE_FILE_LINE_HEADER } from "./constants";
import Packet from "./packet";
import { printPacket } from "./pretty";
import { toHex } from "./utils";

export default class Trace {
    constructor(public packets: Packet[], public videoUrl?: string) {

    }

    serializeToText() {
        const start = this.packets[0]?.timestamp || 0
        const text = this.packets.map(pkt =>
            `${pkt.timestamp - start}\t${toHex(pkt.toBuffer())}\t${printPacket(pkt, {})}`
        )
        text.unshift('time\tdata\tdescription')
        text.unshift(TRACE_FILE_LINE_HEADER);
        return text.join('\n');
    }
}


import Packet from "./packet"
import { printPacket } from "./pretty"
import { toHex } from "./utils"

export default class Trace {
    constructor(public packets: Packet[] = [], public description?: string) {}

    get length() {
        return this.packets.length
    }

    get duration() {
        if (!this.packets.length) return 0
        return (
            this.packets[this.packets.length - 1].timestamp -
            this.packets[0].timestamp
        )
    }

    get startTimestamp() {
        return this.packets[0]?.timestamp || 0
    }

    get endTimestamp() {
        return this.packets[this.packets.length - 1]?.timestamp || 0
    }

    addPacket(pkt: Packet, maxLength = -1) {
        this.packets.push(pkt)
        if (maxLength > 0 && this.packets.length > maxLength * 1.1) {
            // 10% overshoot of max
            this.packets = this.packets.slice(-maxLength)
        }
    }

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

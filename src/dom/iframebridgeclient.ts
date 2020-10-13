import { JDBus } from "./bus";
import { JDClient } from "./client";
import { PACKET_BRIDGE, PACKET_SEND } from "./constants";
import Packet from "./packet";

export interface PacketMessage {
    channel: "jacdac";
    type: "messagepacket";
    broadcast: true;
    outer: true;
    data: Uint8Array;
}

/**
 * A client that bridges received and sent packets to a parent iframe
 */
export default class IFrameBridgeClient extends JDClient {
    constructor(readonly bus: JDBus, private parentOrigin: string = "*") {
        super()
        this.parentOrigin = this.parentOrigin || "*";
        console.log(`jdbridge: origin ${this.parentOrigin}`);
        this.postPacket = this.postPacket.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        if (this.supported)
            this.registerEvents();
    }

    private registerEvents() {
        console.log(`jdiframe: listening for packets`)
        this.mount(this.bus.subscribe(PACKET_BRIDGE, this.postPacket));
        this.mount(this.bus.subscribe(PACKET_SEND, this.postPacket))

        window.addEventListener("message", this.handleMessage, false);
        this.mount(() => window.removeEventListener("message", this.handleMessage, false))
    }

    private handleMessage(event: MessageEvent) {
        if (this.parentOrigin !== "*" && event.origin !== this.parentOrigin)
            return; // wrong origin

        const msg = event.data as PacketMessage;
        if (!msg
            || !msg.broadcast
            || msg.channel !== "jacdac"
            || msg.type !== "messagepacket"
            || !msg.outer)
            return; // not our message

        // send to bus
        const pkt = Packet.fromBinary(msg.data, this.bus.timestamp);
        console.log(`jdiframe: process pkt`, pkt)
        this.bus.processPacket(pkt, true);
    }

    private postPacket(pkt: Packet) {
        console.log(`jd: send iframe pkt`)

        const msg: PacketMessage = {
            type: "messagepacket",
            channel: "jacdac",
            broadcast: true,
            outer: true,
            data: pkt.toBuffer()
        }
        // may not be in iframe
        window.parent?.postMessage(msg, this.parentOrigin)
    }

    get supported(): boolean {
        return typeof window !== "undefined";
    }
}
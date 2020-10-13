import { JDBus } from "./bus";
import { JDClient } from "./client";
import { PACKET_BRIDGE, PACKET_SEND } from "./constants";
import JDIFrameClient from "./iframeclient";
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
export default class IFrameBridgeClient extends JDIFrameClient {
    constructor(readonly bus: JDBus) {
        super(bus)
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
        if (this.origin !== "*" && event.origin !== this.origin)
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
        this.bus.processPacket(pkt, true);
    }

    private postPacket(pkt: Packet) {
        const msg: PacketMessage = {
            type: "messagepacket",
            channel: "jacdac",
            broadcast: true,
            outer: true,
            data: pkt.toBuffer()
        }
        // may not be in iframe
        window.parent?.postMessage(msg, this.origin)
    }

    get supported(): boolean {
        return typeof window !== "undefined";
    }
}
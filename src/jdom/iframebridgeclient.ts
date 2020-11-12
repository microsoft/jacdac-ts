import { JDBus } from "./bus";
import { PACKET_PROCESS, PACKET_SEND } from "./constants";
import JDIFrameClient from "./iframeclient";
import Packet from "./packet";
import { crc } from "./utils";

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
    // this is a unique id used to trace packets sent by this bridge
    readonly bridgeId = "bridge" + Math.random();
    constructor(readonly bus: JDBus) {
        super(bus)
        this.postPacket = this.postPacket.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.registerEvents();
    }

    private registerEvents() {
        console.log(`jdiframe: listening for packets`)
        this.mount(this.bus.subscribe(PACKET_PROCESS, this.postPacket));
        this.mount(this.bus.subscribe(PACKET_SEND, this.postPacket))

        window.addEventListener("message", this.handleMessage, false);
        this.mount(() => window.removeEventListener("message", this.handleMessage, false))
    }

    private handleMessage(event: MessageEvent) {
        if (!this.isOriginValid(event))
            return;

        const msg = event.data as PacketMessage;
        if (!msg
            || !msg.broadcast
            || msg.channel !== "jacdac"
            || msg.type !== "messagepacket"
            || !msg.outer)
            return; // not our message

        const pkt = Packet.fromBinary(msg.data, this.bus.timestamp);
        if (!pkt)
            return;

        // we're adding a little trace to avoid resending our own packets
        pkt.sender = this.bridgeId;

        // send to native bus
        this.bus.sendPacketAsync(pkt);
        // send to javascript bus
        this.bus.processPacket(pkt);
    }

    private postPacket(pkt: Packet) {
        // check we sent this packet
        if (pkt.sender === this.bridgeId)
            return;

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
}
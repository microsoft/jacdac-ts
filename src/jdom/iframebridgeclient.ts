import { JDBus } from "./bus";
import { PACKET_PROCESS, PACKET_SEND } from "./constants";
import JDIFrameClient from "./iframeclient";
import Packet from "./packet";
import { crc } from "./utils";

export interface PacketMessage {
    channel: "jacdac";
    type: "messagepacket";
    broadcast: true;
    data: Uint8Array;
    sender?: string;
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

        const { data } = event;
        const msg = data as PacketMessage;
        if (msg
            && msg.channel === "jacdac"
            && msg.type === "messagepacket") {
            this.handleMessageJacdac(msg);
        }
        else if (data?.source === "pxtdriver") {
            this.handleDriverMessage(data);
        }
        else {
            // unknown message
            // console.log({ data })
        }
    }

    private handleDriverMessage(msg: { type: string }) {
        switch (msg.type) {
            case "stop": // start again
                this.bus.clear();
                break;
        }
    }

    private handleMessageJacdac(msg: PacketMessage) {
        const pkt = Packet.fromBinary(msg.data, this.bus.timestamp);
        if (!pkt)
            return;

        // we're adding a little trace to avoid resending our own packets
        // if not specified
        pkt.sender = msg.sender || this.bridgeId;
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
            data: pkt.toBuffer(),
            sender: this.bridgeId
        }
        // may not be in iframe
        window.parent?.postMessage(msg, this.origin)
    }
}
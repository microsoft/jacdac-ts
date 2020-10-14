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
        if (this.supported)
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
        if (this.origin !== "*" && event.origin !== this.origin)
            return; // wrong origin

        const msg = event.data as PacketMessage;
        if (!msg
            || !msg.broadcast
            || msg.channel !== "jacdac"
            || msg.type !== "messagepacket"
            || !msg.outer)
            return; // not our message

        // sanity-check size
        if (msg.data.length > 252) {
            console.log("data too long");
            return;
        }

        const sz = (msg.data.length + 3) & ~3
        const data = new Uint8Array(sz)
        data.set(msg.data)
        data[2] = sz - 12

        const chk = crc(data.slice(2))
        data[0] = chk & 0xff
        data[1] = (chk >> 8) & 0xff

        const pkt = Packet.fromBinary(data, this.bus.timestamp);
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

    get supported(): boolean {
        return typeof window !== "undefined";
    }
}
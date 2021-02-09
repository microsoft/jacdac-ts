import { JDBus } from "./bus";
import { DEVICE_ANNOUNCE, PACKET_PROCESS, PACKET_SEND } from "./constants";
import JDIFrameClient from "./iframeclient";
import Packet from "./packet";
import { debounce, toHex } from "./utils";

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
    packetSent = 0;
    packetProcessed = 0;
    private _lastAspectRatio: number = 0;

    constructor(readonly bus: JDBus, readonly frameId: string) {
        super(bus)
        this.postPacket = this.postPacket.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleResize = debounce(this.handleResize.bind(this), 500);
        this.registerEvents();
    }

    private registerEvents() {
        console.log(`jdiframe: listening for packets`)
        this.mount(this.bus.subscribe(PACKET_PROCESS, this.postPacket));
        this.mount(this.bus.subscribe(PACKET_SEND, this.postPacket))
        this.mount(this.bus.subscribe(DEVICE_ANNOUNCE, this.handleResize));

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
        console.log("pxt message", msg)
        switch (msg.type) {
            case "run": // simulation is starting
                this.bus.clear();
                break;
            case "stop": // start again
                // pause bus?:
                break;
        }
    }

    private handleResize() {
        const size = document.body.getBoundingClientRect()
        const value = size.width / size.height;
        if (!isNaN(value) && this._lastAspectRatio !== value) {
            window.parent.postMessage({
                type: "aspectratio",
                value,
                frameid: this.frameId,
                sender: this.bridgeId
            }, "*");
            this._lastAspectRatio = value;
        }
    }


    private handleMessageJacdac(msg: PacketMessage) {
        const pkt = Packet.fromBinary(msg.data, this.bus.timestamp);
        if (!pkt)
            return;
        if (pkt.sender === this.bridgeId)  // returning packet
            return;
        this.packetProcessed++;
        // we're adding a little trace to avoid resending our own packets
        pkt.sender = this.bridgeId;

        // check CRC, and bail out if needed.
        if (!this.bus.checkCRC(pkt)) { // TODO: stop here when bugs are fixed
            console.log({ data: toHex(msg.data) })
        }

        // send to native bus
        this.bus.sendPacketAsync(pkt);
        // send to javascript bus
        this.bus.processPacket(pkt);
    }

    private postPacket(pkt: Packet) {
        // check if this packet was already sent from another spot
        if (!!pkt.sender || !window.parent || window.parent === window)
            return;

        this.packetSent++;
        pkt.sender = this.bridgeId;
        const msg: PacketMessage = {
            type: "messagepacket",
            channel: "jacdac",
            broadcast: true,
            data: pkt.toBuffer(),
            sender: this.bridgeId
        }
        window.parent.postMessage(msg, this.origin)
    }
}
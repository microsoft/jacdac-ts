import { JDBus } from "./bus";
import { DEVICE_CHANGE, PACKET_PROCESS, PACKET_SEND } from "./constants";
import JDIFrameClient from "./iframeclient";
import Packet from "./packet";
import { debounce, roundWithPrecision } from "./utils";

const MIN_ASPECT_RATIO = 0.89;

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
    private _lastAspectRatio = 0;

    constructor(readonly bus: JDBus, readonly frameId: string) {
        super(bus)
        this.postPacket = this.postPacket.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleResize = debounce(this.handleResize.bind(this), 200);
        this.registerEvents();
    }

    private registerEvents() {
        console.log(`jdiframe: listening for packets`)
        this.mount(this.bus.subscribe(PACKET_PROCESS, this.postPacket));
        this.mount(this.bus.subscribe(PACKET_SEND, this.postPacket))
        this.mount(this.bus.subscribe(DEVICE_CHANGE, this.handleResize));
        const id = setInterval(this.handleResize, 500)
        this.mount(() => clearInterval(id))

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
                // don't clear!
                break;
            case "stop": // start again
                // pause bus?:
                break;
        }
    }

    private handleResize() {
        const size = document.body.getBoundingClientRect()
        const ar = size.width / (size.height + 12); 
        const value = roundWithPrecision(Math.min(MIN_ASPECT_RATIO, size.width / size.height), 4);
        if (!isNaN(ar) && this._lastAspectRatio !== value) {
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
        if (msg.sender === this.bridgeId)  // returning packet
            return;
        // try frame format (sent by hardware, hosts)
        let pkts = Packet.fromFrame(msg.data, this.bus.timestamp);
        if (!pkts.length) {
            // try as a single packet (send by the MakeCode simulator)
            const pkt = Packet.fromBinary(msg.data, this.bus.timestamp);
            pkts = pkt && [pkt];
        }
        this.packetProcessed += pkts.length;

        for (const pkt of pkts) {
            // we're adding a little trace to avoid resending our own packets
            pkt.sender = this.bridgeId;
            // send to native bus
            this.bus.sendPacketAsync(pkt);
            // send to javascript bus
            this.bus.processPacket(pkt);
        }
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
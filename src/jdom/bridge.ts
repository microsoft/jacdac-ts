import { JDBus } from "./bus";
import { JDClient } from "./client";
import { CHANGE, PACKET_PROCESS, PACKET_SEND } from "./constants";
import Packet from "./packet";
import { randomDeviceId } from "./utils";

/**
 * A client that bridges received and sent packets to a parent iframe.
 */
export default abstract class JDBridge extends JDClient {
    private _bus: JDBus;
    readonly bridgeId = randomDeviceId()
    packetSent = 0;
    packetProcessed = 0;

    constructor() {
        super()
        this.handleSendPacket = this.handleSendPacket.bind(this);
    }

    get bus() {
        return this._bus;
    }

    set bus(newBus: JDBus) {
        if (newBus !== this._bus) {
            if (this._bus)
                this.unmount();
            this._bus = newBus;
            if (this._bus) {
                this.mount(this._bus.subscribe(PACKET_PROCESS, this.handleSendPacket));
                this.mount(this._bus.subscribe(PACKET_SEND, this.handleSendPacket))
                this.mount(this._bus.addBridge(this));
            }
            this.emit(CHANGE);
        }
    }

    /**
     * Receives frame data payload and injects it into the bus
     * @param data
     * @returns 
     */
    protected receiveFrame(data: Uint8Array) {
        if (!this._bus)
            return; // disconnected

        // try frame format (sent by hardware, hosts)
        const pkts = Packet.fromFrame(data, this.bus.timestamp);
        this.dispatchPackets(pkts);
    }

    /**
     * Receives packet data payload and injects it into the bus
     * @param data
     * @returns 
     */
    protected receivePacket(data: Uint8Array) {
        if (!this._bus)
            return; // disconnected

        // try as a single packet (send by the MakeCode simulator)
        const pkt = Packet.fromBinary(data, this.bus.timestamp);
        if (pkt)
           this.dispatchPackets([pkt]);
    }

    private dispatchPackets(pkts: Packet[]) {
        // bail out if no packets
        if (!pkts?.length)
            return;

        this.packetProcessed += pkts.length;

        for (const pkt of pkts) {
            // tracing the source of packets to avoid self-resending
            pkt.sender = this.bridgeId;
            // send to native bus
            this.bus.sendPacketAsync(pkt);
            // send to javascript bus
            this.bus.processPacket(pkt);
        }
    }

    private handleSendPacket(pkt: Packet) {
        if (!this._bus || pkt.sender === this.bridgeId)
            return;
        this.packetSent++;
        this.sendPacket(pkt.toBuffer());
    }

    /**
     * Sends packet data over the bridge
     * @param pkt 
     */
    protected abstract sendPacket(data: Uint8Array): void;
}
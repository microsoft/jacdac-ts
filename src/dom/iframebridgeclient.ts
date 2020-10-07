import { JDBus } from "./bus";
import { JDClient } from "./client";
import { PACKET_PROCESS, PACKET_SEND } from "./constants";
import { Packet } from "./packet";

export interface PacketMessage {
    type: "jacdac";
    broadcast: true;
    packet: Uint8Array;
}

/**
 * A client that bridges received and sent packets to a parent iframe
 */
export default class IFrameBridgeClient extends JDClient {
    constructor(readonly bus: JDBus, readonly parentOrigin: string = "*") {
        super()
        this.postPacket = this.postPacket.bind(this);
        if (this.supported)
            this.registerEvents();
    }

    private registerEvents() {
        this.mount(this.bus.subscribe(PACKET_PROCESS, this.postPacket));
        this.mount(this.bus.subscribe(PACKET_SEND, this.postPacket))
    }

    private postPacket(pkt: Packet) {
        const msg: PacketMessage = {
            type: "jacdac",
            broadcast: true,
            packet: pkt.toBuffer()
        }
        window.parent.postMessage(msg, this.parentOrigin)
    }

    get supported(): boolean {
        try {
            return typeof window !== "undefined"
                && window.self !== window.top
        } catch (e) {
            return true;
        }
    }
}
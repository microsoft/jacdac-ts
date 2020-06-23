import { Packet } from "./packet";
/**
 * A transport layer for the jacdac packets
 */
export interface Bus {
    send: (p: Packet) => Promise<void>;
}
/**
 * Register transport layer function that sends packet.
 * @param f transport function sending packet.
 */
export declare function setBus(bus: Bus): void;
/**
 * Sends a packet over the bus
 * @param p
 */
export declare function sendPacket(p: Packet): Promise<void>;
/**
 * Ingests and process a packet received from the bus.
 * @param pkt a jacdac packet
 */
export declare function processPacket(pkt: Packet): void;

import { Packet } from "./packet"
import { getDevice } from "./device"
import { bufferEq } from "./utils"
import { JD_SERVICE_NUMBER_CTRL, CMD_ADVERTISEMENT_DATA } from "./constants";

/**
 * A transport layer for the jacdac packets
 */
export interface Bus {
    send: (p: Packet) => Promise<void>;
}

let _bus: Bus;

/**
 * Register transport layer function that sends packet.
 * @param f transport function sending packet.
 */
export function setBus(bus: Bus) {
    _bus = bus;
}

/**
 * Sends a packet over the bus
 * @param p 
 */
export function sendPacket(p: Packet): Promise<void> {
    return _bus ? _bus.send(p) : Promise.resolve();
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPacket = exports.setBus = void 0;
var _bus;
/**
 * Register transport layer function that sends packet.
 * @param f transport function sending packet.
 */
function setBus(bus) {
    _bus = bus;
}
exports.setBus = setBus;
/**
 * Sends a packet over the bus
 * @param p
 */
function sendPacket(p) {
    return _bus ? _bus.send(p) : Promise.resolve();
}
exports.sendPacket = sendPacket;
//# sourceMappingURL=bus.js.map
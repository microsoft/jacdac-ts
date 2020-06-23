"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPacket = exports.sendPacket = exports.setBus = void 0;
var device_1 = require("./device");
var utils_1 = require("./utils");
var constants_1 = require("./constants");
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
/**
 * Ingests and process a packet received from the bus.
 * @param pkt a jacdac packet
 */
function processPacket(pkt) {
    if (pkt.multicommand_class) {
        //
    }
    else if (pkt.is_command) {
        pkt.dev = device_1.getDevice(pkt.device_identifier);
    }
    else {
        var dev = pkt.dev = device_1.getDevice(pkt.device_identifier);
        dev.lastSeen = pkt.timestamp;
        if (pkt.service_number == constants_1.JD_SERVICE_NUMBER_CTRL) {
            if (pkt.service_command == constants_1.CMD_ADVERTISEMENT_DATA) {
                if (!utils_1.bufferEq(pkt.data, dev.services)) {
                    dev.services = pkt.data;
                    dev.lastServiceUpdate = pkt.timestamp;
                    // reattach(dev)
                }
            }
        }
    }
}
exports.processPacket = processPacket;
//# sourceMappingURL=bus.js.map
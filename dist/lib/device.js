"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPacket = exports.shortDeviceId = exports.Device = exports.getDevice = exports.getDevices = exports.deviceNames = void 0;
var packet_1 = require("./packet");
var constants_1 = require("./constants");
var utils_1 = require("./utils");
var devices_ = [];
exports.deviceNames = {};
/**
 * Gets the current list of known devices on the bus
 */
function getDevices() { return devices_.slice(); }
exports.getDevices = getDevices;
/**
 * Gets a device on the bus
 * @param id
 */
function getDevice(id) {
    var d = devices_.find(function (d) { return d.deviceId == id; });
    if (!d)
        d = new Device(id);
    return d;
}
exports.getDevice = getDevice;
var Device = /** @class */ (function () {
    function Device(deviceId) {
        this.deviceId = deviceId;
        devices_.push(this);
    }
    Object.defineProperty(Device.prototype, "name", {
        get: function () {
            return exports.deviceNames[this.deviceId] || exports.deviceNames[this.shortId];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Device.prototype, "shortId", {
        get: function () {
            // TODO measure if caching is worth it
            if (!this._shortId)
                this._shortId = shortDeviceId(this.deviceId);
            return this._shortId;
        },
        enumerable: false,
        configurable: true
    });
    Device.prototype.toString = function () {
        return this.shortId + (this.name ? " (" + this.name + ")" : "");
    };
    Device.prototype.hasService = function (service_class) {
        for (var i = 4; i < this.services.length; i += 4)
            if (utils_1.getNumber(this.services, 11 /* UInt32LE */, i) == service_class)
                return true;
        return false;
    };
    Device.prototype.serviceAt = function (idx) {
        idx <<= 2;
        if (!this.services || idx + 4 > this.services.length)
            return undefined;
        return utils_1.read32(this.services, idx);
    };
    Device.prototype.sendCtrlCommand = function (cmd, payload) {
        if (payload === void 0) { payload = null; }
        var pkt = !payload ? packet_1.Packet.onlyHeader(cmd) : packet_1.Packet.from(cmd, payload);
        pkt.service_number = constants_1.JD_SERVICE_NUMBER_CTRL;
        pkt.sendCmdAsync(this);
    };
    return Device;
}());
exports.Device = Device;
// 4 letter ID; 0.04%/0.01%/0.002% collision probability among 20/10/5 devices
// 3 letter ID; 1.1%/2.6%/0.05%
// 2 letter ID; 25%/6.4%/1.5%
function shortDeviceId(devid) {
    var h = utils_1.hash(utils_1.fromHex(devid), 30);
    return String.fromCharCode(0x41 + h % 26) +
        String.fromCharCode(0x41 + utils_1.idiv(h, 26) % 26) +
        String.fromCharCode(0x41 + utils_1.idiv(h, 26 * 26) % 26) +
        String.fromCharCode(0x41 + utils_1.idiv(h, 26 * 26 * 26) % 26);
}
exports.shortDeviceId = shortDeviceId;
/**
 * Ingests and process a packet received from the bus.
 * @param pkt a jacdac packet
 */
function processPacket(pkt) {
    if (pkt.multicommand_class) {
        //
    }
    else if (pkt.is_command) {
        pkt.dev = getDevice(pkt.device_identifier);
    }
    else {
        var dev = pkt.dev = getDevice(pkt.device_identifier);
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
//# sourceMappingURL=device.js.map
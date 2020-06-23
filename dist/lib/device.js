import { Packet } from "./packet";
import { JD_SERVICE_NUMBER_CTRL } from "./constants";
import { hash, fromHex, idiv, getNumber, read32 } from "./utils";
var devices_ = [];
export var deviceNames = {};
/**
 * Gets the current list of known devices on the bus
 */
export function getDevices() { return devices_.slice(); }
/**
 * Gets a device on the bus
 * @param id
 */
export function getDevice(id) {
    var d = devices_.find(function (d) { return d.deviceId == id; });
    if (!d)
        d = new Device(id);
    return d;
}
var Device = /** @class */ (function () {
    function Device(deviceId) {
        this.deviceId = deviceId;
        devices_.push(this);
    }
    Object.defineProperty(Device.prototype, "name", {
        get: function () {
            return deviceNames[this.deviceId] || deviceNames[this.shortId];
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
            if (getNumber(this.services, 11 /* UInt32LE */, i) == service_class)
                return true;
        return false;
    };
    Device.prototype.serviceAt = function (idx) {
        idx <<= 2;
        if (!this.services || idx + 4 > this.services.length)
            return undefined;
        return read32(this.services, idx);
    };
    Device.prototype.sendCtrlCommand = function (cmd, payload) {
        if (payload === void 0) { payload = null; }
        var pkt = !payload ? Packet.onlyHeader(cmd) : Packet.from(cmd, payload);
        pkt.service_number = JD_SERVICE_NUMBER_CTRL;
        pkt.sendCmdAsync(this);
    };
    return Device;
}());
export { Device };
// 4 letter ID; 0.04%/0.01%/0.002% collision probability among 20/10/5 devices
// 3 letter ID; 1.1%/2.6%/0.05%
// 2 letter ID; 25%/6.4%/1.5%
export function shortDeviceId(devid) {
    var h = hash(fromHex(devid), 30);
    return String.fromCharCode(0x41 + h % 26) +
        String.fromCharCode(0x41 + idiv(h, 26) % 26) +
        String.fromCharCode(0x41 + idiv(h, 26 * 26) % 26) +
        String.fromCharCode(0x41 + idiv(h, 26 * 26 * 26) % 26);
}
//# sourceMappingURL=device.js.map
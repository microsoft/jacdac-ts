"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.process = exports.Packet = exports.Device = exports.getDevice = exports.getDevices = exports.setSendPacketFn = exports.deviceNames = exports.shortDeviceId = exports.JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS = exports.JD_FRAME_FLAG_ACK_REQUESTED = exports.JD_FRAME_FLAG_COMMAND = exports.JD_SERVICE_NUMBER_CTRL = exports.JD_SERVICE_NUMBER_STREAM = exports.JD_SERVICE_NUMBER_CRC_ACK = exports.JD_SERVICE_NUMBER_INV_MASK = exports.JD_SERVICE_NUMBER_MASK = exports.JD_SERIAL_MAX_PAYLOAD_SIZE = exports.JD_SERIAL_HEADER_SIZE = exports.STREAM_METADATA_MASK = exports.STREAM_CLOSE_MASK = exports.STREAM_COUNTER_MASK = exports.STREAM_PORT_SHIFT = exports.CMD_CTRL_RESET = exports.CMD_CTRL_IDENTIFY = exports.CMD_CTRL_NOOP = exports.CMD_GET_DESCRIPTION = exports.CMD_CALIBRATE = exports.CMD_EVENT = exports.CMD_ADVERTISEMENT_DATA = exports.CMD_REG_MASK = exports.CMD_TOP_MASK = exports.CMD_SET_REG = exports.CMD_GET_REG = exports.REG_READING = exports.REG_MAX_POWER = exports.REG_HIGH_THRESHOLD = exports.REG_LOW_THRESHOLD = exports.REG_STREAMING_INTERVAL = exports.REG_IS_STREAMING = exports.REG_VALUE = exports.REG_INTENSITY = void 0;
var U = require("./pxtutils");
// Registers 0x001-0x07f - r/w common to all services
// Registers 0x080-0x0ff - r/w defined per-service
// Registers 0x100-0x17f - r/o common to all services
// Registers 0x180-0x1ff - r/o defined per-service
// Registers 0x200-0xeff - custom, defined per-service
// Registers 0xf00-0xfff - reserved for implementation, should not be on the wire
// this is either binary (0 or non-zero), or can be gradual (eg. brightness of neopixel)
exports.REG_INTENSITY = 0x01;
// the primary value of actuator (eg. servo angle)
exports.REG_VALUE = 0x02;
// enable/disable streaming
exports.REG_IS_STREAMING = 0x03;
// streaming interval in miliseconds
exports.REG_STREAMING_INTERVAL = 0x04;
// for analog sensors
exports.REG_LOW_THRESHOLD = 0x05;
exports.REG_HIGH_THRESHOLD = 0x06;
// limit power drawn; in mA
exports.REG_MAX_POWER = 0x07;
// eg. one number for light sensor, all 3 coordinates for accelerometer
exports.REG_READING = 0x101;
exports.CMD_GET_REG = 0x1000;
exports.CMD_SET_REG = 0x2000;
exports.CMD_TOP_MASK = 0xf000;
exports.CMD_REG_MASK = 0x0fff;
// Commands 0x000-0x07f - common to all services
// Commands 0x080-0xeff - defined per-service
// Commands 0xf00-0xfff - reserved for implementation
// enumeration data for CTRL, ad-data for other services
exports.CMD_ADVERTISEMENT_DATA = 0x00;
// event from sensor or on broadcast service
exports.CMD_EVENT = 0x01;
// request to calibrate sensor
exports.CMD_CALIBRATE = 0x02;
// request human-readable description of service
exports.CMD_GET_DESCRIPTION = 0x03;
// Commands specific to control service
// do nothing
exports.CMD_CTRL_NOOP = 0x80;
// blink led or otherwise draw user's attention
exports.CMD_CTRL_IDENTIFY = 0x81;
// reset device
exports.CMD_CTRL_RESET = 0x82;
exports.STREAM_PORT_SHIFT = 7;
exports.STREAM_COUNTER_MASK = 0x001f;
exports.STREAM_CLOSE_MASK = 0x0020;
exports.STREAM_METADATA_MASK = 0x0040;
exports.JD_SERIAL_HEADER_SIZE = 16;
exports.JD_SERIAL_MAX_PAYLOAD_SIZE = 236;
exports.JD_SERVICE_NUMBER_MASK = 0x3f;
exports.JD_SERVICE_NUMBER_INV_MASK = 0xc0;
exports.JD_SERVICE_NUMBER_CRC_ACK = 0x3f;
exports.JD_SERVICE_NUMBER_STREAM = 0x3e;
exports.JD_SERVICE_NUMBER_CTRL = 0x00;
// the COMMAND flag signifies that the device_identifier is the recipent
// (i.e., it's a command for the peripheral); the bit clear means device_identifier is the source
// (i.e., it's a report from peripheral or a broadcast message)
exports.JD_FRAME_FLAG_COMMAND = 0x01;
// an ACK should be issued with CRC of this package upon reception
exports.JD_FRAME_FLAG_ACK_REQUESTED = 0x02;
// the device_identifier contains target service class number
exports.JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS = 0x04;
function error(msg) {
    throw new Error(msg);
}
function log(msg, v) {
    if (v === undefined)
        console.log("JD: " + msg);
    else
        console.log("JD: " + msg, v);
}
function warn(msg, v) {
    if (v === undefined)
        console.log("JD-WARN: " + msg);
    else
        console.log("JD-WARN: " + msg, v);
}
function idiv(a, b) { return ((a | 0) / (b | 0)) | 0; }
function fnv1(data) {
    var h = 0x811c9dc5;
    for (var i = 0; i < data.length; ++i) {
        h = Math.imul(h, 0x1000193) ^ data[i];
    }
    return h;
}
function hash(buf, bits) {
    bits |= 0;
    if (bits < 1)
        return 0;
    var h = fnv1(buf);
    if (bits >= 32)
        return h >>> 0;
    else
        return ((h ^ (h >>> bits)) & ((1 << bits) - 1)) >>> 0;
}
// 4 letter ID; 0.04%/0.01%/0.002% collision probability among 20/10/5 devices
// 3 letter ID; 1.1%/2.6%/0.05%
// 2 letter ID; 25%/6.4%/1.5%
function shortDeviceId(devid) {
    var h = hash(U.fromHex(devid), 30);
    return String.fromCharCode(0x41 + h % 26) +
        String.fromCharCode(0x41 + idiv(h, 26) % 26) +
        String.fromCharCode(0x41 + idiv(h, 26 * 26) % 26) +
        String.fromCharCode(0x41 + idiv(h, 26 * 26 * 26) % 26);
}
exports.shortDeviceId = shortDeviceId;
var devices_ = [];
exports.deviceNames = {};
var sendPacketFn = function (p) { return Promise.resolve(undefined); };
function setSendPacketFn(f) {
    sendPacketFn = f;
}
exports.setSendPacketFn = setSendPacketFn;
function getDevices() { return devices_.slice(); }
exports.getDevices = getDevices;
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
            if (U.getNumber(this.services, 11 /* UInt32LE */, i) == service_class)
                return true;
        return false;
    };
    Device.prototype.serviceAt = function (idx) {
        idx <<= 2;
        if (!this.services || idx + 4 > this.services.length)
            return undefined;
        return U.read32(this.services, idx);
    };
    Device.prototype.sendCtrlCommand = function (cmd, payload) {
        if (payload === void 0) { payload = null; }
        var pkt = !payload ? Packet.onlyHeader(cmd) : Packet.from(cmd, payload);
        pkt.service_number = exports.JD_SERVICE_NUMBER_CTRL;
        pkt.sendCmdAsync(this);
    };
    return Device;
}());
exports.Device = Device;
var Packet = /** @class */ (function () {
    function Packet() {
    }
    Packet.fromBinary = function (buf) {
        var p = new Packet();
        p._header = buf.slice(0, exports.JD_SERIAL_HEADER_SIZE);
        p._data = buf.slice(exports.JD_SERIAL_HEADER_SIZE);
        return p;
    };
    Packet.from = function (service_command, data) {
        var p = new Packet();
        p._header = new Uint8Array(exports.JD_SERIAL_HEADER_SIZE);
        p.data = data;
        p.service_command = service_command;
        return p;
    };
    Packet.onlyHeader = function (service_command) {
        return Packet.from(service_command, new Uint8Array(0));
    };
    Packet.prototype.toBuffer = function () {
        return U.bufferConcat(this._header, this._data);
    };
    Object.defineProperty(Packet.prototype, "device_identifier", {
        get: function () {
            return U.toHex(this._header.slice(4, 4 + 8));
        },
        set: function (id) {
            var idb = U.fromHex(id);
            if (idb.length != 8)
                error("Invalid id");
            this._header.set(idb, 4);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Packet.prototype, "frame_flags", {
        get: function () { return this._header[3]; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Packet.prototype, "multicommand_class", {
        get: function () {
            if (this.frame_flags & exports.JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS)
                return U.read32(this._header, 4);
            return undefined;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Packet.prototype, "size", {
        get: function () {
            return this._header[12];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Packet.prototype, "requires_ack", {
        get: function () {
            return (this.frame_flags & exports.JD_FRAME_FLAG_ACK_REQUESTED) ? true : false;
        },
        set: function (ack) {
            if (ack != this.requires_ack)
                this._header[3] ^= exports.JD_FRAME_FLAG_ACK_REQUESTED;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Packet.prototype, "service_number", {
        get: function () {
            return this._header[13] & exports.JD_SERVICE_NUMBER_MASK;
        },
        set: function (service_number) {
            if (service_number == null)
                throw "service_number not set";
            this._header[13] = (this._header[13] & exports.JD_SERVICE_NUMBER_INV_MASK) | service_number;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Packet.prototype, "service_class", {
        get: function () {
            if (this.dev)
                return this.dev.serviceAt(this.service_number);
            return undefined;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Packet.prototype, "crc", {
        get: function () {
            return U.read16(this._header, 0);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Packet.prototype, "service_command", {
        get: function () {
            return U.read16(this._header, 14);
        },
        set: function (cmd) {
            U.write16(this._header, 14, cmd);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Packet.prototype, "is_reg_set", {
        get: function () {
            return (this.service_command >> 12) == (exports.CMD_SET_REG >> 12);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Packet.prototype, "is_reg_get", {
        get: function () {
            return (this.service_command >> 12) == (exports.CMD_GET_REG >> 12);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Packet.prototype, "data", {
        get: function () {
            return this._data;
        },
        set: function (buf) {
            if (buf.length > exports.JD_SERIAL_MAX_PAYLOAD_SIZE)
                throw "Too big";
            this._header[12] = buf.length;
            this._data = buf;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Packet.prototype, "uintData", {
        get: function () {
            var buf = this._data;
            if (buf.length == 0)
                return undefined;
            if (buf.length < 4)
                buf = U.bufferConcat(buf, new Uint8Array(4));
            return U.read32(buf, 0);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Packet.prototype, "intData", {
        get: function () {
            var fmt;
            switch (this._data.length) {
                case 0:
                    return undefined;
                case 1:
                    fmt = 1 /* Int8LE */;
                    break;
                case 2:
                case 3:
                    fmt = 3 /* Int16LE */;
                    break;
                default:
                    fmt = 5 /* Int32LE */;
                    break;
            }
            return this.getNumber(fmt, 0);
        },
        enumerable: false,
        configurable: true
    });
    Packet.prototype.compress = function (stripped) {
        if (stripped.length == 0)
            return;
        var sz = -4;
        for (var _i = 0, stripped_1 = stripped; _i < stripped_1.length; _i++) {
            var s = stripped_1[_i];
            sz += s.length;
        }
        var data = new Uint8Array(sz);
        this._header.set(stripped[0], 12);
        data.set(stripped[0].slice(4), 0);
        sz = stripped[0].length - 4;
        for (var _a = 0, _b = stripped.slice(1); _a < _b.length; _a++) {
            var s = _b[_a];
            data.set(s, sz);
            sz += s.length;
        }
        this._data = data;
    };
    Packet.prototype.withFrameStripped = function () {
        return U.bufferConcat(this._header.slice(12, 12 + 4), this._data);
    };
    Packet.prototype.getNumber = function (fmt, offset) {
        return U.getNumber(this._data, fmt, offset);
    };
    Object.defineProperty(Packet.prototype, "is_command", {
        get: function () {
            return !!(this.frame_flags & exports.JD_FRAME_FLAG_COMMAND);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Packet.prototype, "is_report", {
        get: function () {
            return !this.is_command;
        },
        enumerable: false,
        configurable: true
    });
    Packet.prototype.toString = function () {
        var msg = this.device_identifier + "/" + this.service_number + "[" + this.frame_flags + "]: " + this.service_command + " sz=" + this.size;
        if (this.size < 20)
            msg += ": " + U.toHex(this.data);
        else
            msg += ": " + U.toHex(this.data.slice(0, 20)) + "...";
        return msg;
    };
    Packet.prototype.sendCoreAsync = function () {
        this._header[2] = this.size + 4;
        U.write16(this._header, 0, crc(U.bufferConcat(this._header.slice(2), this._data)));
        return sendPacketFn(this);
    };
    Packet.prototype.sendReportAsync = function (dev) {
        if (!dev)
            return Promise.resolve();
        this.device_identifier = dev.deviceId;
        return this.sendCoreAsync();
    };
    Packet.prototype.sendCmdAsync = function (dev) {
        if (!dev)
            return Promise.resolve();
        this.device_identifier = dev.deviceId;
        this._header[3] |= exports.JD_FRAME_FLAG_COMMAND;
        return this.sendCoreAsync();
    };
    Packet.prototype.sendAsMultiCommandAsync = function (service_class) {
        this._header[3] |= exports.JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS | exports.JD_FRAME_FLAG_COMMAND;
        U.write32(this._header, 4, service_class);
        U.write32(this._header, 8, 0);
        return this.sendCoreAsync();
    };
    Packet.fromFrame = function (frame, timestamp) {
        return frameToPackets(frame, timestamp);
    };
    return Packet;
}());
exports.Packet = Packet;
function crc(p) {
    var crc = 0xffff;
    for (var i = 0; i < p.length; ++i) {
        var data = p[i];
        var x = (crc >> 8) ^ data;
        x ^= x >> 4;
        crc = (crc << 8) ^ (x << 12) ^ (x << 5) ^ x;
        crc &= 0xffff;
    }
    return crc;
}
function ALIGN(n) { return (n + 3) & ~3; }
function frameToPackets(frame, timestamp) {
    var size = frame[2] || 0;
    if (frame.length < size + 12) {
        warn(timestamp + "ms: got only " + frame.length + " bytes; expecting " + (size + 12));
    }
    else if (size < 4) {
        warn(timestamp + "ms: empty packet");
    }
    else {
        var computed = crc(frame.slice(2, size + 12));
        var actual = U.read16(frame, 0);
        if (actual != computed)
            console.log("crc mismatch; sz=" + size + " got:" + actual + ", exp:" + computed);
        var res = [];
        if (frame.length != 12 + frame[2])
            warn(timestamp + "ms: unexpected packet len: " + frame.length);
        for (var ptr = 12; ptr < 12 + frame[2];) {
            var psz = frame[ptr] + 4;
            var sz = ALIGN(psz);
            var pkt = U.bufferConcat(frame.slice(0, 12), frame.slice(ptr, ptr + psz));
            if (ptr + sz > 12 + frame[2])
                warn(timestamp + "ms: invalid frame compression, res len=" + res.length);
            var p = Packet.fromBinary(pkt);
            p.timestamp = timestamp;
            res.push(p);
            ptr += sz;
        }
        return res;
    }
    return [];
}
function process(pkt) {
    if (pkt.multicommand_class) {
        //
    }
    else if (pkt.is_command) {
        pkt.dev = getDevice(pkt.device_identifier);
    }
    else {
        var dev = pkt.dev = getDevice(pkt.device_identifier);
        dev.lastSeen = pkt.timestamp;
        if (pkt.service_number == exports.JD_SERVICE_NUMBER_CTRL) {
            if (pkt.service_command == exports.CMD_ADVERTISEMENT_DATA) {
                if (!U.bufferEq(pkt.data, dev.services)) {
                    dev.services = pkt.data;
                    dev.lastServiceUpdate = pkt.timestamp;
                    // reattach(dev)
                }
            }
        }
    }
}
exports.process = process;
//# sourceMappingURL=jd.js.map
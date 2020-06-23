(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.jacdac = {})));
}(this, (function (exports) { 'use strict';

    // Registers 0x001-0x07f - r/w common to all services
    // Registers 0x080-0x0ff - r/w defined per-service
    // Registers 0x100-0x17f - r/o common to all services
    // Registers 0x180-0x1ff - r/o defined per-service
    // Registers 0x200-0xeff - custom, defined per-service
    // Registers 0xf00-0xfff - reserved for implementation, should not be on the wire
    // this is either binary (0 or non-zero), or can be gradual (eg. brightness of neopixel)
    var REG_INTENSITY = 0x01;
    // the primary value of actuator (eg. servo angle)
    var REG_VALUE = 0x02;
    // enable/disable streaming
    var REG_IS_STREAMING = 0x03;
    // streaming interval in miliseconds
    var REG_STREAMING_INTERVAL = 0x04;
    // for analog sensors
    var REG_LOW_THRESHOLD = 0x05;
    var REG_HIGH_THRESHOLD = 0x06;
    // limit power drawn; in mA
    var REG_MAX_POWER = 0x07;
    // eg. one number for light sensor, all 3 coordinates for accelerometer
    var REG_READING = 0x101;
    var CMD_GET_REG = 0x1000;
    var CMD_SET_REG = 0x2000;
    var CMD_TOP_MASK = 0xf000;
    var CMD_REG_MASK = 0x0fff;
    // Commands 0x000-0x07f - common to all services
    // Commands 0x080-0xeff - defined per-service
    // Commands 0xf00-0xfff - reserved for implementation
    // enumeration data for CTRL, ad-data for other services
    var CMD_ADVERTISEMENT_DATA = 0x00;
    // event from sensor or on broadcast service
    var CMD_EVENT = 0x01;
    // request to calibrate sensor
    var CMD_CALIBRATE = 0x02;
    // request human-readable description of service
    var CMD_GET_DESCRIPTION = 0x03;
    // Commands specific to control service
    // do nothing
    var CMD_CTRL_NOOP = 0x80;
    // blink led or otherwise draw user's attention
    var CMD_CTRL_IDENTIFY = 0x81;
    // reset device
    var CMD_CTRL_RESET = 0x82;
    var STREAM_PORT_SHIFT = 7;
    var STREAM_COUNTER_MASK = 0x001f;
    var STREAM_CLOSE_MASK = 0x0020;
    var STREAM_METADATA_MASK = 0x0040;
    var JD_SERIAL_HEADER_SIZE = 16;
    var JD_SERIAL_MAX_PAYLOAD_SIZE = 236;
    var JD_SERVICE_NUMBER_MASK = 0x3f;
    var JD_SERVICE_NUMBER_INV_MASK = 0xc0;
    var JD_SERVICE_NUMBER_CRC_ACK = 0x3f;
    var JD_SERVICE_NUMBER_STREAM = 0x3e;
    var JD_SERVICE_NUMBER_CTRL = 0x00;
    // the COMMAND flag signifies that the device_identifier is the recipent
    // (i.e., it's a command for the peripheral); the bit clear means device_identifier is the source
    // (i.e., it's a report from peripheral or a broadcast message)
    var JD_FRAME_FLAG_COMMAND = 0x01;
    // an ACK should be issued with CRC of this package upon reception
    var JD_FRAME_FLAG_ACK_REQUESTED = 0x02;
    // the device_identifier contains target service class number
    var JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS = 0x04;

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
    function delay(millis, value) {
        return new Promise(function (resolve) { return setTimeout(function () { return resolve(value); }, millis); });
    }
    function memcpy(trg, trgOff, src, srcOff, len) {
        if (srcOff === void 0)
            srcOff = 0;
        if (len === void 0)
            len = src.length - srcOff;
        for (var i = 0; i < len; ++i)
            trg[trgOff + i] = src[srcOff + i];
    }
    function bufferEq(a, b) {
        if (a == b)
            return true;
        if (!a || !b || a.length != b.length)
            return false;
        for (var i = 0; i < a.length; ++i) {
            if (a[i] != b[i])
                return false;
        }
        return true;
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
    function idiv(a, b) { return ((a | 0) / (b | 0)) | 0; }
    function fnv1(data) {
        var h = 0x811c9dc5;
        for (var i = 0; i < data.length; ++i) {
            h = Math.imul(h, 0x1000193) ^ data[i];
        }
        return h;
    }
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
    // this will take lower 8 bits from each character
    function stringToUint8Array(input) {
        var len = input.length;
        var res = new Uint8Array(len);
        for (var i = 0; i < len; ++i)
            res[i] = input.charCodeAt(i) & 0xff;
        return res;
    }
    function uint8ArrayToString(input) {
        var len = input.length;
        var res = "";
        for (var i = 0; i < len; ++i)
            res += String.fromCharCode(input[i]);
        return res;
    }
    function fromUTF8(binstr) {
        if (!binstr)
            return "";
        // escape function is deprecated
        var escaped = "";
        for (var i = 0; i < binstr.length; ++i) {
            var k = binstr.charCodeAt(i) & 0xff;
            if (k == 37 || k > 0x7f) {
                escaped += "%" + k.toString(16);
            }
            else {
                escaped += binstr.charAt(i);
            }
        }
        // decodeURIComponent does the actual UTF8 decoding
        return decodeURIComponent(escaped);
    }
    function toUTF8(str, cesu8) {
        var res = "";
        if (!str)
            return res;
        for (var i = 0; i < str.length; ++i) {
            var code = str.charCodeAt(i);
            if (code <= 0x7f)
                res += str.charAt(i);
            else if (code <= 0x7ff) {
                res += String.fromCharCode(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
            }
            else {
                if (!cesu8 && 0xd800 <= code && code <= 0xdbff) {
                    var next = str.charCodeAt(++i);
                    if (!isNaN(next))
                        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
                }
                if (code <= 0xffff)
                    res += String.fromCharCode(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
                else
                    res += String.fromCharCode(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
            }
        }
        return res;
    }
    var PromiseBuffer = /** @class */ (function () {
        function PromiseBuffer() {
            this.waiting = [];
            this.available = [];
        }
        PromiseBuffer.prototype.drain = function () {
            for (var _i = 0, _a = this.waiting; _i < _a.length; _i++) {
                var f = _a[_i];
                f(new Error("Promise Buffer Reset"));
            }
            this.waiting = [];
            this.available = [];
        };
        PromiseBuffer.prototype.pushError = function (v) {
            this.push(v);
        };
        PromiseBuffer.prototype.push = function (v) {
            var f = this.waiting.shift();
            if (f)
                f(v);
            else
                this.available.push(v);
        };
        PromiseBuffer.prototype.shiftAsync = function (timeout) {
            var _this = this;
            if (timeout === void 0) { timeout = 0; }
            if (this.available.length > 0) {
                var v = this.available.shift();
                if (v instanceof Error)
                    return Promise.reject(v);
                else
                    return Promise.resolve(v);
            }
            else
                return new Promise(function (resolve, reject) {
                    var f = function (v) {
                        if (v instanceof Error)
                            reject(v);
                        else
                            resolve(v);
                    };
                    _this.waiting.push(f);
                    if (timeout > 0) {
                        delay(timeout)
                            .then(function () {
                            var idx = _this.waiting.indexOf(f);
                            if (idx >= 0) {
                                _this.waiting.splice(idx, 1);
                                reject(new Error("Timeout"));
                            }
                        });
                    }
                });
        };
        return PromiseBuffer;
    }());
    var PromiseQueue = /** @class */ (function () {
        function PromiseQueue() {
            this.promises = {};
        }
        PromiseQueue.prototype.enqueue = function (id, f) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                var arr = _this.promises[id];
                if (!arr) {
                    arr = _this.promises[id] = [];
                }
                var cleanup = function () {
                    arr.shift();
                    if (arr.length == 0)
                        delete _this.promises[id];
                    else
                        arr[0]();
                };
                arr.push(function () {
                    return f().then(function (v) {
                        cleanup();
                        resolve(v);
                    }, function (err) {
                        cleanup();
                        reject(err);
                    });
                });
                if (arr.length == 1)
                    arr[0]();
            });
        };
        return PromiseQueue;
    }());
    function toHex(bytes) {
        var r = "";
        for (var i = 0; i < bytes.length; ++i)
            r += ("0" + bytes[i].toString(16)).slice(-2);
        return r;
    }
    function fromHex(hex) {
        var r = new Uint8Array(hex.length >> 1);
        for (var i = 0; i < hex.length; i += 2)
            r[i >> 1] = parseInt(hex.slice(i, i + 2), 16);
        return r;
    }
    function write32(buf, pos, v) {
        buf[pos + 0] = (v >> 0) & 0xff;
        buf[pos + 1] = (v >> 8) & 0xff;
        buf[pos + 2] = (v >> 16) & 0xff;
        buf[pos + 3] = (v >> 24) & 0xff;
    }
    function write16(buf, pos, v) {
        buf[pos + 0] = (v >> 0) & 0xff;
        buf[pos + 1] = (v >> 8) & 0xff;
    }
    function read32(buf, pos) {
        return (buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16) | (buf[pos + 3] << 24)) >>> 0;
    }
    function read16(buf, pos) {
        return buf[pos] | (buf[pos + 1] << 8);
    }
    function encodeU32LE(words) {
        var r = new Uint8Array(words.length * 4);
        for (var i = 0; i < words.length; ++i)
            write32(r, i * 4, words[i]);
        return r;
    }
    function decodeU32LE(buf) {
        var res = [];
        for (var i = 0; i < buf.length; i += 4)
            res.push(read32(buf, i));
        return res;
    }
    function getNumber(buf, fmt, offset) {
        switch (fmt) {
            case 7 /* UInt8BE */:
            case 2 /* UInt8LE */:
                return buf[offset];
            case 6 /* Int8BE */:
            case 1 /* Int8LE */:
                return (buf[offset] << 24) >> 24;
            case 4 /* UInt16LE */:
                return read16(buf, offset);
            case 3 /* Int16LE */:
                return (read16(buf, offset) << 16) >> 16;
            case 11 /* UInt32LE */:
                return read32(buf, offset);
            case 5 /* Int32LE */:
                return read32(buf, offset) >> 0;
            default:
                throw new Error("unsupported fmt:" + fmt);
        }
    }
    function bufferToString(buf) {
        return fromUTF8(uint8ArrayToString(buf));
    }
    function bufferConcat(a, b) {
        var r = new Uint8Array(a.length + b.length);
        r.set(a, 0);
        r.set(b, a.length);
        return r;
    }
    function jsonCopyFrom(trg, src) {
        var v = clone(src);
        for (var _i = 0, _a = Object.keys(src); _i < _a.length; _i++) {
            var k = _a[_i];
            trg[k] = v[k];
        }
    }
    function assert(cond, msg) {
        if (msg === void 0) { msg = "Assertion failed"; }
        if (!cond) {
            debugger;
            throw new Error(msg);
        }
    }
    function flatClone(obj) {
        if (obj == null)
            return null;
        var r = {};
        Object.keys(obj).forEach(function (k) { r[k] = obj[k]; });
        return r;
    }
    function clone(v) {
        if (v == null)
            return null;
        return JSON.parse(JSON.stringify(v));
    }

    var devices_ = [];
    var deviceNames = {};
    /**
     * Gets the current list of known devices on the bus
     */
    function getDevices() { return devices_.slice(); }
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
    // 4 letter ID; 0.04%/0.01%/0.002% collision probability among 20/10/5 devices
    // 3 letter ID; 1.1%/2.6%/0.05%
    // 2 letter ID; 25%/6.4%/1.5%
    function shortDeviceId(devid) {
        var h = hash(fromHex(devid), 30);
        return String.fromCharCode(0x41 + h % 26) +
            String.fromCharCode(0x41 + idiv(h, 26) % 26) +
            String.fromCharCode(0x41 + idiv(h, 26 * 26) % 26) +
            String.fromCharCode(0x41 + idiv(h, 26 * 26 * 26) % 26);
    }

    var _bus;
    /**
     * Register transport layer function that sends packet.
     * @param f transport function sending packet.
     */
    function setBus(bus) {
        _bus = bus;
    }
    /**
     * Sends a packet over the bus
     * @param p
     */
    function sendPacket(p) {
        return _bus ? _bus.send(p) : Promise.resolve();
    }
    /**
     * Ingests and process a packet received from the bus.
     * @param pkt a jacdac packet
     */
    function processPacket(pkt) {
        if (pkt.multicommand_class) ;
        else if (pkt.is_command) {
            pkt.dev = getDevice(pkt.device_identifier);
        }
        else {
            var dev = pkt.dev = getDevice(pkt.device_identifier);
            dev.lastSeen = pkt.timestamp;
            if (pkt.service_number == JD_SERVICE_NUMBER_CTRL) {
                if (pkt.service_command == CMD_ADVERTISEMENT_DATA) {
                    if (!bufferEq(pkt.data, dev.services)) {
                        dev.services = pkt.data;
                        dev.lastServiceUpdate = pkt.timestamp;
                        // reattach(dev)
                    }
                }
            }
        }
    }

    var Packet = /** @class */ (function () {
        function Packet() {
        }
        Packet.fromBinary = function (buf) {
            var p = new Packet();
            p._header = buf.slice(0, JD_SERIAL_HEADER_SIZE);
            p._data = buf.slice(JD_SERIAL_HEADER_SIZE);
            return p;
        };
        Packet.from = function (service_command, data) {
            var p = new Packet();
            p._header = new Uint8Array(JD_SERIAL_HEADER_SIZE);
            p.data = data;
            p.service_command = service_command;
            return p;
        };
        Packet.onlyHeader = function (service_command) {
            return Packet.from(service_command, new Uint8Array(0));
        };
        Packet.prototype.toBuffer = function () {
            return bufferConcat(this._header, this._data);
        };
        Object.defineProperty(Packet.prototype, "device_identifier", {
            get: function () {
                return toHex(this._header.slice(4, 4 + 8));
            },
            set: function (id) {
                var idb = fromHex(id);
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
                if (this.frame_flags & JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS)
                    return read32(this._header, 4);
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
                return (this.frame_flags & JD_FRAME_FLAG_ACK_REQUESTED) ? true : false;
            },
            set: function (ack) {
                if (ack != this.requires_ack)
                    this._header[3] ^= JD_FRAME_FLAG_ACK_REQUESTED;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Packet.prototype, "service_number", {
            get: function () {
                return this._header[13] & JD_SERVICE_NUMBER_MASK;
            },
            set: function (service_number) {
                if (service_number == null)
                    throw new Error("service_number not set");
                this._header[13] = (this._header[13] & JD_SERVICE_NUMBER_INV_MASK) | service_number;
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
                return read16(this._header, 0);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Packet.prototype, "service_command", {
            get: function () {
                return read16(this._header, 14);
            },
            set: function (cmd) {
                write16(this._header, 14, cmd);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Packet.prototype, "is_reg_set", {
            get: function () {
                return (this.service_command >> 12) == (CMD_SET_REG >> 12);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Packet.prototype, "is_reg_get", {
            get: function () {
                return (this.service_command >> 12) == (CMD_SET_REG >> 12);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Packet.prototype, "data", {
            get: function () {
                return this._data;
            },
            set: function (buf) {
                if (buf.length > JD_SERIAL_MAX_PAYLOAD_SIZE)
                    throw Error("Too big");
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
                    buf = bufferConcat(buf, new Uint8Array(4));
                return read32(buf, 0);
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
            return bufferConcat(this._header.slice(12, 12 + 4), this._data);
        };
        Packet.prototype.getNumber = function (fmt, offset) {
            return getNumber(this._data, fmt, offset);
        };
        Object.defineProperty(Packet.prototype, "is_command", {
            get: function () {
                return !!(this.frame_flags & JD_FRAME_FLAG_COMMAND);
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
                msg += ": " + toHex(this.data);
            else
                msg += ": " + toHex(this.data.slice(0, 20)) + "...";
            return msg;
        };
        Packet.prototype.sendCoreAsync = function () {
            this._header[2] = this.size + 4;
            write16(this._header, 0, crc(bufferConcat(this._header.slice(2), this._data)));
            return sendPacket(this);
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
            this._header[3] |= JD_FRAME_FLAG_COMMAND;
            return this.sendCoreAsync();
        };
        Packet.prototype.sendAsMultiCommandAsync = function (service_class) {
            this._header[3] |= JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS | JD_FRAME_FLAG_COMMAND;
            write32(this._header, 4, service_class);
            write32(this._header, 8, 0);
            return this.sendCoreAsync();
        };
        Packet.fromFrame = function (frame, timestamp) {
            return frameToPackets(frame, timestamp);
        };
        return Packet;
    }());
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
            var actual = read16(frame, 0);
            if (actual != computed)
                console.log("crc mismatch; sz=" + size + " got:" + actual + ", exp:" + computed);
            var res = [];
            if (frame.length != 12 + frame[2])
                warn(timestamp + "ms: unexpected packet len: " + frame.length);
            for (var ptr = 12; ptr < 12 + frame[2];) {
                var psz = frame[ptr] + 4;
                var sz = ALIGN(psz);
                var pkt = bufferConcat(frame.slice(0, 12), frame.slice(ptr, ptr + psz));
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

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    function __awaiter(thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    var controlTransferGetReport = 0x01;
    var controlTransferSetReport = 0x09;
    var controlTransferOutReport = 0x200;
    var controlTransferInReport = 0x100;
    // see https://github.com/microsoft/uf2/blob/master/hf2.md for full spec
    var HF2_CMD_BININFO = 0x0001; // no arguments
    var HF2_MODE_BOOTLOADER = 0x01;
    var HF2_MODE_USERSPACE = 0x02;
    /*
    struct HF2_BININFO_Result {
        uint32_t mode;
        uint32_t flash_page_size;
        uint32_t flash_num_pages;
        uint32_t max_message_size;
    };
    */
    var HF2_CMD_INFO = 0x0002;
    // no arguments
    // results is utf8 character array
    var HF2_CMD_RESET_INTO_APP = 0x0003; // no arguments, no result
    var HF2_CMD_RESET_INTO_BOOTLOADER = 0x0004; // no arguments, no result
    var HF2_CMD_START_FLASH = 0x0005; // no arguments, no result
    var HF2_CMD_WRITE_FLASH_PAGE = 0x0006;
    /*
    struct HF2_WRITE_FLASH_PAGE_Command {
        uint32_t target_addr;
        uint32_t data[flash_page_size];
    };
    */
    // no result
    var HF2_CMD_CHKSUM_PAGES = 0x0007;
    /*
    struct HF2_CHKSUM_PAGES_Command {
        uint32_t target_addr;
        uint32_t num_pages;
    };
    struct HF2_CHKSUM_PAGES_Result {
        uint16_t chksums[num_pages];
    };
    */
    var HF2_CMD_READ_WORDS = 0x0008;
    /*
    struct HF2_READ_WORDS_Command {
        uint32_t target_addr;
        uint32_t num_words;
    };
    struct HF2_READ_WORDS_Result {
        uint32_t words[num_words];
    };
    */
    var HF2_CMD_WRITE_WORDS = 0x0009;
    /*
    struct HF2_WRITE_WORDS_Command {
        uint32_t target_addr;
        uint32_t num_words;
        uint32_t words[num_words];
    };
    */
    // no result
    var HF2_CMD_DMESG = 0x0010;
    // no arguments
    // results is utf8 character array
    var HF2_FLAG_SERIAL_OUT = 0x80;
    var HF2_FLAG_SERIAL_ERR = 0xC0;
    var HF2_FLAG_CMDPKT_LAST = 0x40;
    var HF2_FLAG_CMDPKT_BODY = 0x00;
    var HF2_FLAG_MASK = 0xC0;
    var HF2_SIZE_MASK = 63;
    var HF2_STATUS_OK = 0x00;
    var HF2_STATUS_INVALID_CMD = 0x01;
    var HF2_STATUS_EXEC_ERR = 0x02;
    var HF2_STATUS_EVENT = 0x80;
    // the eventId is overlayed on the tag+status; the mask corresponds
    // to the HF2_STATUS_EVENT above
    var HF2_EV_MASK = 0x800000;
    var HF2_CMD_JDS_CONFIG = 0x0020;
    var HF2_CMD_JDS_SEND = 0x0021;
    var HF2_EV_JDS_PACKET = 0x800020;
    var Transport = /** @class */ (function () {
        function Transport(requestDevice) {
            this.requestDevice = requestDevice;
            this.readLoopStarted = false;
            this.ready = false;
            this.onData = function (v) { };
            this.onError = function (e) {
                console.error("HF2 error: " + (e ? e.stack : e));
            };
        }
        Transport.prototype.log = function (msg, v) {
            if (v != undefined)
                console.log("HF2: " + msg, v);
            else
                console.log("HF2: " + msg);
        };
        Transport.prototype.clearDev = function () {
            if (this.dev) {
                this.dev = null;
                this.epIn = null;
                this.epOut = null;
            }
        };
        Transport.prototype.disconnectAsync = function () {
            var _this = this;
            this.ready = false;
            if (!this.dev)
                return Promise.resolve();
            this.log("close device");
            return this.dev.close()
                .catch(function (e) {
                // just ignore errors closing, most likely device just disconnected
            })
                .then(function () {
                _this.clearDev();
                return delay(500);
            });
        };
        Transport.prototype.recvPacketAsync = function () {
            var _this = this;
            var final = function (res) {
                if (res.status != "ok")
                    _this.error("USB IN transfer failed");
                var arr = new Uint8Array(res.data.buffer);
                if (arr.length == 0)
                    return _this.recvPacketAsync();
                return arr;
            };
            if (!this.dev)
                return Promise.reject(new Error("Disconnected"));
            if (!this.epIn) {
                return this.dev.controlTransferIn({
                    requestType: "class",
                    recipient: "interface",
                    request: controlTransferGetReport,
                    value: controlTransferInReport,
                    index: this.iface.interfaceNumber
                }, 64).then(final);
            }
            return this.dev.transferIn(this.epIn.endpointNumber, 64)
                .then(final);
        };
        Transport.prototype.error = function (msg) {
            throw new Error("USB error on device " + (this.dev ? this.dev.productName : "n/a") + " (" + msg + ")");
        };
        Transport.prototype.readLoop = function () {
            return __awaiter(this, void 0, void 0, function () {
                var buf, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (this.readLoopStarted)
                                return [2 /*return*/];
                            this.readLoopStarted = true;
                            this.log("start read loop");
                            _a.label = 1;
                        case 1:
                            if (!this.ready) {
                                return [3 /*break*/, 10];
                                //await U.delay(300)
                                //continue
                            }
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 7, , 9]);
                            return [4 /*yield*/, this.recvPacketAsync()];
                        case 3:
                            buf = _a.sent();
                            if (!buf[0]) return [3 /*break*/, 4];
                            // we've got data; retry reading immedietly after processing it
                            this.onData(buf);
                            return [3 /*break*/, 6];
                        case 4: 
                        // throttle down if no data coming
                        return [4 /*yield*/, delay(5)];
                        case 5:
                            // throttle down if no data coming
                            _a.sent();
                            _a.label = 6;
                        case 6: return [3 /*break*/, 9];
                        case 7:
                            err_1 = _a.sent();
                            if (this.dev)
                                this.onError(err_1);
                            return [4 /*yield*/, delay(300)];
                        case 8:
                            _a.sent();
                            return [3 /*break*/, 9];
                        case 9: return [3 /*break*/, 1];
                        case 10: return [2 /*return*/];
                    }
                });
            });
        };
        Transport.prototype.sendPacketAsync = function (pkt) {
            var _this = this;
            if (!this.dev)
                return Promise.reject(new Error("Disconnected"));
            assert(pkt.length <= 64);
            if (!this.epOut) {
                return this.dev.controlTransferOut({
                    requestType: "class",
                    recipient: "interface",
                    request: controlTransferSetReport,
                    value: controlTransferOutReport,
                    index: this.iface.interfaceNumber
                }, pkt).then(function (res) {
                    if (res.status != "ok")
                        _this.error("USB CTRL OUT transfer failed");
                });
            }
            return this.dev.transferOut(this.epOut.endpointNumber, pkt)
                .then(function (res) {
                if (res.status != "ok")
                    _this.error("USB OUT transfer failed");
            });
        };
        Transport.prototype.init = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = this;
                            return [4 /*yield*/, this.requestDevice({ filters: [{}] })];
                        case 1:
                            _a.dev = _b.sent();
                            this.log("connect device: " + this.dev.manufacturerName + " " + this.dev.productName);
                            return [4 /*yield*/, this.dev.open()];
                        case 2:
                            _b.sent();
                            return [4 /*yield*/, this.dev.selectConfiguration(1)];
                        case 3:
                            _b.sent();
                            if (this.altIface.endpoints.length) {
                                this.epIn = this.altIface.endpoints.filter(function (e) { return e.direction == "in"; })[0];
                                this.epOut = this.altIface.endpoints.filter(function (e) { return e.direction == "out"; })[0];
                                assert(this.epIn.packetSize == 64);
                                assert(this.epOut.packetSize == 64);
                            }
                            this.log("claim interface");
                            return [4 /*yield*/, this.dev.claimInterface(this.iface.interfaceNumber)];
                        case 4:
                            _b.sent();
                            this.log("all connected");
                            this.ready = true;
                            this.readLoop();
                            return [2 /*return*/];
                    }
                });
            });
        };
        return Transport;
    }());
    var Proto = /** @class */ (function () {
        function Proto(io) {
            var _this = this;
            this.io = io;
            this.eventHandlers = {};
            this.msgs = new PromiseBuffer();
            this.cmdSeq = (Math.random() * 0xffff) | 0;
            this.lock = new PromiseQueue();
            var frames = [];
            io.onData = function (buf) {
                var tp = buf[0] & HF2_FLAG_MASK;
                var len = buf[0] & 63;
                //console.log(`msg tp=${tp} len=${len}`)
                var frame = new Uint8Array(len);
                memcpy(frame, 0, buf, 1, len);
                if (tp & HF2_FLAG_SERIAL_OUT) {
                    _this.onSerial(frame, tp == HF2_FLAG_SERIAL_ERR);
                    return;
                }
                frames.push(frame);
                if (tp == HF2_FLAG_CMDPKT_BODY) {
                    return;
                }
                else {
                    assert(tp == HF2_FLAG_CMDPKT_LAST);
                    var total = 0;
                    for (var _i = 0, frames_1 = frames; _i < frames_1.length; _i++) {
                        var f = frames_1[_i];
                        total += f.length;
                    }
                    var r = new Uint8Array(total);
                    var ptr = 0;
                    for (var _a = 0, frames_2 = frames; _a < frames_2.length; _a++) {
                        var f = frames_2[_a];
                        memcpy(r, ptr, f);
                        ptr += f.length;
                    }
                    frames = [];
                    if (r[2] & HF2_STATUS_EVENT) {
                        // asynchronous event
                        _this.handleEvent(r);
                    }
                    else {
                        _this.msgs.push(r);
                    }
                }
            };
        }
        Proto.prototype.error = function (m) {
            return this.io.error(m);
        };
        Proto.prototype.talkAsync = function (cmd, data) {
            var _this = this;
            var len = 8;
            if (data)
                len += data.length;
            var pkt = new Uint8Array(len);
            var seq = ++this.cmdSeq & 0xffff;
            write32(pkt, 0, cmd);
            write16(pkt, 4, seq);
            write16(pkt, 6, 0);
            if (data)
                memcpy(pkt, 8, data, 0, data.length);
            var numSkipped = 0;
            var handleReturnAsync = function () {
                return _this.msgs.shiftAsync(1000) // we wait up to a second
                    .then(function (res) {
                    if (read16(res, 0) != seq) {
                        if (numSkipped < 3) {
                            numSkipped++;
                            _this.io.log("message out of sync, (" + seq + " vs " + read16(res, 0) + "); will re-try");
                            return handleReturnAsync();
                        }
                        _this.error("out of sync");
                    }
                    var info = "";
                    if (res[3])
                        info = "; info=" + res[3];
                    switch (res[2]) {
                        case HF2_STATUS_OK:
                            return res.slice(4);
                        case HF2_STATUS_INVALID_CMD:
                            _this.error("invalid command" + info);
                            break;
                        case HF2_STATUS_EXEC_ERR:
                            _this.error("execution error" + info);
                            break;
                        default:
                            _this.error("error " + res[2] + info);
                            break;
                    }
                    return null;
                });
            };
            return this.lock.enqueue("talk", function () {
                return _this.sendMsgAsync(pkt)
                    .then(handleReturnAsync);
            });
        };
        Proto.prototype.sendMsgAsync = function (buf, serial) {
            var _this = this;
            if (serial === void 0) { serial = 0; }
            // Util.assert(buf.length <= this.maxMsgSize)
            var frame = new Uint8Array(64);
            var loop = function (pos) {
                var len = buf.length - pos;
                if (len <= 0)
                    return Promise.resolve();
                if (len > 63) {
                    len = 63;
                    frame[0] = HF2_FLAG_CMDPKT_BODY;
                }
                else {
                    frame[0] = HF2_FLAG_CMDPKT_LAST;
                }
                if (serial)
                    frame[0] = serial == 1 ? HF2_FLAG_SERIAL_OUT : HF2_FLAG_SERIAL_ERR;
                frame[0] |= len;
                for (var i = 0; i < len; ++i)
                    frame[i + 1] = buf[pos + i];
                return _this.io.sendPacketAsync(frame)
                    .then(function () { return loop(pos + len); });
            };
            return loop(0);
        };
        Proto.prototype.onEvent = function (id, f) {
            assert(!!(id & HF2_EV_MASK));
            this.eventHandlers[id + ""] = f;
        };
        Proto.prototype.onJDMessage = function (f) {
            this.talkAsync(HF2_CMD_JDS_CONFIG, encodeU32LE([1]));
            this.onEvent(HF2_EV_JDS_PACKET, f);
        };
        Proto.prototype.sendJDMessageAsync = function (buf) {
            return this.talkAsync(HF2_CMD_JDS_SEND, buf);
        };
        Proto.prototype.handleEvent = function (buf) {
            var evid = read32(buf, 0);
            var f = this.eventHandlers[evid + ""];
            if (f) {
                f(buf.slice(4));
            }
            else {
                this.io.log("unhandled event: " + evid.toString(16));
            }
        };
        Proto.prototype.onSerial = function (data, iserr) {
            console.log("SERIAL:", bufferToString(data));
        };
        Proto.prototype.init = function () {
            return __awaiter(this, void 0, void 0, function () {
                var buf;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.io.init()];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.talkAsync(HF2_CMD_INFO)];
                        case 2:
                            buf = _a.sent();
                            this.io.log("Connected to: " + bufferToString(buf));
                            return [2 /*return*/];
                    }
                });
            });
        };
        return Proto;
    }());

    var service_classes = {
        "<disabled>": -1,
        CTRL: 0,
        LOGGER: 0x12dc1fca,
        BATTERY: 0x1d2a2acd,
        ACCELEROMETER: 0x1f140409,
        BUTTON: 0x1473a263,
        TOUCHBUTTON: 0x130cf5be,
        LIGHT_SENSOR: 0x15e7a0ff,
        MICROPHONE: 0x1a5c5866,
        THERMOMETER: 0x1421bac7,
        SWITCH: 0x14218172,
        PIXEL: 0x1768fbbf,
        HAPTIC: 0x116b14a3,
        LIGHT: 0x126f00e0,
        KEYBOARD: 0x1ae4812d,
        MOUSE: 0x14bc97bf,
        GAMEPAD: 0x100527e8,
        MUSIC: 0x1b57b1d7,
        SERVO: 0x12fc9103,
        CONTROLLER: 0x188ae4b8,
        LCD: 0x18d5284c,
        MESSAGE_BUS: 0x115cabf5,
        COLOR_SENSOR: 0x14d6dda2,
        LIGHT_SPECTRUM_SENSOR: 0x16fa0c0d,
        PROXIMITY: 0x14c1791b,
        TOUCH_BUTTONS: 0x1acb49d5,
        SERVOS: 0x182988d8,
        ROTARY_ENCODER: 0x10fa29c9,
        DNS: 0x117729bd,
        PWM_LIGHT: 0x1fb57453,
        BOOTLOADER: 0x1ffa9948,
        ARCADE_CONTROLS: 0x1deaa06e,
        POWER: 0x1fa4c95a,
        SLIDER: 0x1f274746,
        MOTOR: 0x17004cd8,
        TCP: 0x1b43b70b,
        WIFI: 0x18aae1fa,
    };
    var generic_commands = {
        CMD_ADVERTISEMENT_DATA: 0x00,
        CMD_EVENT: 0x01,
        CMD_CALIBRATE: 0x02,
        CMD_GET_DESCRIPTION: 0x03,
    };
    var generic_regs = {
        REG_INTENSITY: 0x01,
        REG_VALUE: 0x02,
        REG_IS_STREAMING: 0x03,
        REG_STREAMING_INTERVAL: 0x04,
        REG_LOW_THRESHOLD: 0x05,
        REG_HIGH_THRESHOLD: 0x06,
        REG_MAX_POWER: 0x07,
        REG_READING: 0x101
    };
    var serv_decoders = {
        LOGGER: function (pkt) {
            var pri = priority();
            if (!pri)
                return null;
            return pri + " \"" + bufferToString(pkt.data) + "\"";
            function priority() {
                switch (pkt.service_command) {
                    case 0x80: return "dbg";
                    case 0x81: return "log";
                    case 0x82: return "warn";
                    case 0x83: return "err";
                    default: return null;
                }
            }
        }
    };
    function reverseLookup(map, n) {
        for (var _i = 0, _a = Object.keys(map); _i < _a.length; _i++) {
            var k = _a[_i];
            if (map[k] == n)
                return k;
        }
        return toHex$1(n);
    }
    function serviceName(n) {
        if (n == null)
            return "?";
        return reverseLookup(service_classes, n);
    }
    function commandName(n) {
        var pref = "";
        if ((n & CMD_TOP_MASK) == CMD_SET_REG)
            pref = "SET[";
        else if ((n & CMD_TOP_MASK) == CMD_GET_REG)
            pref = "GET[";
        if (pref) {
            var reg = n & CMD_REG_MASK;
            return pref + reverseLookup(generic_regs, reg) + "]";
        }
        return reverseLookup(generic_commands, n);
    }
    function toHex$1(n) {
        return "0x" + n.toString(16);
    }
    function num2str(n) {
        return n + " (0x" + n.toString(16) + ")";
    }
    function printPacket(pkt, opts) {
        var _a;
        if (opts === void 0) { opts = {}; }
        var frame_flags = pkt._header[3];
        var devname = pkt.dev ? pkt.dev.name || pkt.dev.shortId : pkt.device_identifier;
        if (frame_flags & JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS)
            devname = "[mul] " + serviceName(pkt.multicommand_class);
        var serv_id = serviceName((_a = pkt === null || pkt === void 0 ? void 0 : pkt.dev) === null || _a === void 0 ? void 0 : _a.serviceAt(pkt.service_number));
        var service_name = serv_id + " (" + pkt.service_number + ")";
        var cmd = pkt.service_command;
        var cmdname = commandName(cmd);
        if (pkt.service_number == JD_SERVICE_NUMBER_CRC_ACK) {
            service_name = "CRC-ACK";
            cmdname = toHex$1(cmd);
        }
        if (pkt.service_number == JD_SERVICE_NUMBER_STREAM) {
            service_name = "STREAM";
            cmdname = "port:" + (cmd >> STREAM_PORT_SHIFT) + " cnt:" + (cmd & STREAM_COUNTER_MASK);
            if (cmd & STREAM_METADATA_MASK)
                cmdname += " meta";
            if (cmd & STREAM_CLOSE_MASK)
                cmdname += " close";
        }
        var pdesc = devname + "/" + service_name + ": " + cmdname + "; sz=" + pkt.size;
        if (frame_flags & JD_FRAME_FLAG_COMMAND)
            pdesc = 'to ' + pdesc;
        else
            pdesc = 'from ' + pdesc;
        if (frame_flags & JD_FRAME_FLAG_ACK_REQUESTED)
            pdesc = "[ack:" + toHex$1(pkt.crc) + "] " + pdesc;
        var d = pkt.data;
        if (pkt.dev && pkt.service_number == 0 && pkt.service_command == CMD_ADVERTISEMENT_DATA) {
            if (pkt.dev.lastServiceUpdate < pkt.timestamp) {
                if (opts.skipRepeatedAnnounce)
                    return "";
                else
                    pdesc = " ====== " + pdesc;
            }
            else {
                var services = [];
                for (var i = 0; i < pkt.dev.services.length >> 2; i++) {
                    services.push(serviceName(pkt.dev.serviceAt(i)));
                }
                pdesc += "; " + "Announce services: " + services.join(", ");
            }
        }
        else {
            if (pkt.dev && !pkt.is_command && pkt.service_command == (CMD_GET_REG | REG_READING)) {
                if (opts.skipRepeatedReading && pkt.dev.currentReading && bufferEq(pkt.dev.currentReading, pkt.data))
                    return "";
                pkt.dev.currentReading = pkt.data;
            }
            var decoder = serv_decoders[serv_id];
            var decoded = decoder ? decoder(pkt) : null;
            if (decoded) {
                pdesc += "; " + decoded;
            }
            else if (pkt.service_command == CMD_EVENT) {
                pdesc += "; ev=" + num2str(pkt.intData) + " arg=" + (read32(pkt.data, 4) | 0);
            }
            else if (0 < d.length && d.length <= 4) {
                var v0 = pkt.uintData, v1 = pkt.intData;
                pdesc += "; " + num2str(v0);
                if (v0 != v1)
                    pdesc += "; signed: " + num2str(v1);
            }
            else if (d.length) {
                pdesc += "; " + toHex(d);
            }
        }
        return Math.round(pkt.timestamp) + "ms: " + pdesc;
    }
    function parseLog(logcontents) {
        var res = [];
        var frameBytes = [];
        var lastTime = 0;
        for (var _i = 0, _a = logcontents.split(/\r?\n/); _i < _a.length; _i++) {
            var ln = _a[_i];
            var m = /^JD (\d+) ([0-9a-f]+)/i.exec(ln);
            if (m) {
                res.push({
                    timestamp: parseInt(m[1]),
                    data: fromHex(m[2])
                });
                continue;
            }
            m = /^([\d\.]+),Async Serial,.*(0x[A-F0-9][A-F0-9])/.exec(ln);
            if (!m)
                continue;
            var tm = parseFloat(m[1]);
            if (lastTime && tm - lastTime > 0.1) {
                res.push({
                    timestamp: lastTime * 1000,
                    data: new Uint8Array(frameBytes),
                    info: "timeout"
                });
                frameBytes = [];
                lastTime = 0;
            }
            lastTime = tm;
            if (ln.indexOf("framing error") > 0) {
                if (frameBytes.length > 0)
                    res.push({
                        timestamp: lastTime * 1000,
                        data: new Uint8Array(frameBytes),
                    });
                frameBytes = [];
                lastTime = 0;
            }
            else {
                frameBytes.push(parseInt(m[2]));
            }
        }
        return res;
    }

    exports.REG_INTENSITY = REG_INTENSITY;
    exports.REG_VALUE = REG_VALUE;
    exports.REG_IS_STREAMING = REG_IS_STREAMING;
    exports.REG_STREAMING_INTERVAL = REG_STREAMING_INTERVAL;
    exports.REG_LOW_THRESHOLD = REG_LOW_THRESHOLD;
    exports.REG_HIGH_THRESHOLD = REG_HIGH_THRESHOLD;
    exports.REG_MAX_POWER = REG_MAX_POWER;
    exports.REG_READING = REG_READING;
    exports.CMD_GET_REG = CMD_GET_REG;
    exports.CMD_SET_REG = CMD_SET_REG;
    exports.CMD_TOP_MASK = CMD_TOP_MASK;
    exports.CMD_REG_MASK = CMD_REG_MASK;
    exports.CMD_ADVERTISEMENT_DATA = CMD_ADVERTISEMENT_DATA;
    exports.CMD_EVENT = CMD_EVENT;
    exports.CMD_CALIBRATE = CMD_CALIBRATE;
    exports.CMD_GET_DESCRIPTION = CMD_GET_DESCRIPTION;
    exports.CMD_CTRL_NOOP = CMD_CTRL_NOOP;
    exports.CMD_CTRL_IDENTIFY = CMD_CTRL_IDENTIFY;
    exports.CMD_CTRL_RESET = CMD_CTRL_RESET;
    exports.STREAM_PORT_SHIFT = STREAM_PORT_SHIFT;
    exports.STREAM_COUNTER_MASK = STREAM_COUNTER_MASK;
    exports.STREAM_CLOSE_MASK = STREAM_CLOSE_MASK;
    exports.STREAM_METADATA_MASK = STREAM_METADATA_MASK;
    exports.JD_SERIAL_HEADER_SIZE = JD_SERIAL_HEADER_SIZE;
    exports.JD_SERIAL_MAX_PAYLOAD_SIZE = JD_SERIAL_MAX_PAYLOAD_SIZE;
    exports.JD_SERVICE_NUMBER_MASK = JD_SERVICE_NUMBER_MASK;
    exports.JD_SERVICE_NUMBER_INV_MASK = JD_SERVICE_NUMBER_INV_MASK;
    exports.JD_SERVICE_NUMBER_CRC_ACK = JD_SERVICE_NUMBER_CRC_ACK;
    exports.JD_SERVICE_NUMBER_STREAM = JD_SERVICE_NUMBER_STREAM;
    exports.JD_SERVICE_NUMBER_CTRL = JD_SERVICE_NUMBER_CTRL;
    exports.JD_FRAME_FLAG_COMMAND = JD_FRAME_FLAG_COMMAND;
    exports.JD_FRAME_FLAG_ACK_REQUESTED = JD_FRAME_FLAG_ACK_REQUESTED;
    exports.JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS = JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS;
    exports.error = error;
    exports.log = log;
    exports.warn = warn;
    exports.delay = delay;
    exports.memcpy = memcpy;
    exports.bufferEq = bufferEq;
    exports.hash = hash;
    exports.idiv = idiv;
    exports.fnv1 = fnv1;
    exports.crc = crc;
    exports.ALIGN = ALIGN;
    exports.stringToUint8Array = stringToUint8Array;
    exports.uint8ArrayToString = uint8ArrayToString;
    exports.fromUTF8 = fromUTF8;
    exports.toUTF8 = toUTF8;
    exports.PromiseBuffer = PromiseBuffer;
    exports.PromiseQueue = PromiseQueue;
    exports.toHex = toHex;
    exports.fromHex = fromHex;
    exports.write32 = write32;
    exports.write16 = write16;
    exports.read32 = read32;
    exports.read16 = read16;
    exports.encodeU32LE = encodeU32LE;
    exports.decodeU32LE = decodeU32LE;
    exports.getNumber = getNumber;
    exports.bufferToString = bufferToString;
    exports.bufferConcat = bufferConcat;
    exports.jsonCopyFrom = jsonCopyFrom;
    exports.assert = assert;
    exports.flatClone = flatClone;
    exports.clone = clone;
    exports.Packet = Packet;
    exports.deviceNames = deviceNames;
    exports.getDevices = getDevices;
    exports.getDevice = getDevice;
    exports.Device = Device;
    exports.shortDeviceId = shortDeviceId;
    exports.setBus = setBus;
    exports.sendPacket = sendPacket;
    exports.processPacket = processPacket;
    exports.HF2_CMD_BININFO = HF2_CMD_BININFO;
    exports.HF2_MODE_BOOTLOADER = HF2_MODE_BOOTLOADER;
    exports.HF2_MODE_USERSPACE = HF2_MODE_USERSPACE;
    exports.HF2_CMD_INFO = HF2_CMD_INFO;
    exports.HF2_CMD_RESET_INTO_APP = HF2_CMD_RESET_INTO_APP;
    exports.HF2_CMD_RESET_INTO_BOOTLOADER = HF2_CMD_RESET_INTO_BOOTLOADER;
    exports.HF2_CMD_START_FLASH = HF2_CMD_START_FLASH;
    exports.HF2_CMD_WRITE_FLASH_PAGE = HF2_CMD_WRITE_FLASH_PAGE;
    exports.HF2_CMD_CHKSUM_PAGES = HF2_CMD_CHKSUM_PAGES;
    exports.HF2_CMD_READ_WORDS = HF2_CMD_READ_WORDS;
    exports.HF2_CMD_WRITE_WORDS = HF2_CMD_WRITE_WORDS;
    exports.HF2_CMD_DMESG = HF2_CMD_DMESG;
    exports.HF2_FLAG_SERIAL_OUT = HF2_FLAG_SERIAL_OUT;
    exports.HF2_FLAG_SERIAL_ERR = HF2_FLAG_SERIAL_ERR;
    exports.HF2_FLAG_CMDPKT_LAST = HF2_FLAG_CMDPKT_LAST;
    exports.HF2_FLAG_CMDPKT_BODY = HF2_FLAG_CMDPKT_BODY;
    exports.HF2_FLAG_MASK = HF2_FLAG_MASK;
    exports.HF2_SIZE_MASK = HF2_SIZE_MASK;
    exports.HF2_STATUS_OK = HF2_STATUS_OK;
    exports.HF2_STATUS_INVALID_CMD = HF2_STATUS_INVALID_CMD;
    exports.HF2_STATUS_EXEC_ERR = HF2_STATUS_EXEC_ERR;
    exports.HF2_STATUS_EVENT = HF2_STATUS_EVENT;
    exports.HF2_EV_MASK = HF2_EV_MASK;
    exports.HF2_CMD_JDS_CONFIG = HF2_CMD_JDS_CONFIG;
    exports.HF2_CMD_JDS_SEND = HF2_CMD_JDS_SEND;
    exports.HF2_EV_JDS_PACKET = HF2_EV_JDS_PACKET;
    exports.Transport = Transport;
    exports.Proto = Proto;
    exports.printPacket = printPacket;
    exports.parseLog = parseLog;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=jacdac.umd.js.map

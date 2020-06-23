import { warn, crc, ALIGN, write16, bufferConcat, toHex, fromHex, error, read32, read16, getNumber, write32 } from "./utils";
import { JD_FRAME_FLAG_COMMAND, JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS, CMD_SET_REG, JD_SERIAL_HEADER_SIZE, JD_FRAME_FLAG_ACK_REQUESTED, JD_SERVICE_NUMBER_MASK, JD_SERVICE_NUMBER_INV_MASK, JD_SERIAL_MAX_PAYLOAD_SIZE, } from "./constants";
import { sendPacket } from "./bus";
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
export { Packet };
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
//# sourceMappingURL=packet.js.map
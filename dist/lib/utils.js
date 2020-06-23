export function error(msg) {
    throw new Error(msg);
}
export function log(msg, v) {
    if (v === undefined)
        console.log("JD: " + msg);
    else
        console.log("JD: " + msg, v);
}
export function warn(msg, v) {
    if (v === undefined)
        console.log("JD-WARN: " + msg);
    else
        console.log("JD-WARN: " + msg, v);
}
export function delay(millis, value) {
    return new Promise(function (resolve) { return setTimeout(function () { return resolve(value); }, millis); });
}
export function memcpy(trg, trgOff, src, srcOff, len) {
    if (srcOff === void 0)
        srcOff = 0;
    if (len === void 0)
        len = src.length - srcOff;
    for (var i = 0; i < len; ++i)
        trg[trgOff + i] = src[srcOff + i];
}
export function bufferEq(a, b) {
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
export function hash(buf, bits) {
    bits |= 0;
    if (bits < 1)
        return 0;
    var h = fnv1(buf);
    if (bits >= 32)
        return h >>> 0;
    else
        return ((h ^ (h >>> bits)) & ((1 << bits) - 1)) >>> 0;
}
export function idiv(a, b) { return ((a | 0) / (b | 0)) | 0; }
export function fnv1(data) {
    var h = 0x811c9dc5;
    for (var i = 0; i < data.length; ++i) {
        h = Math.imul(h, 0x1000193) ^ data[i];
    }
    return h;
}
export function crc(p) {
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
export function ALIGN(n) { return (n + 3) & ~3; }
// this will take lower 8 bits from each character
export function stringToUint8Array(input) {
    var len = input.length;
    var res = new Uint8Array(len);
    for (var i = 0; i < len; ++i)
        res[i] = input.charCodeAt(i) & 0xff;
    return res;
}
export function uint8ArrayToString(input) {
    var len = input.length;
    var res = "";
    for (var i = 0; i < len; ++i)
        res += String.fromCharCode(input[i]);
    return res;
}
export function fromUTF8(binstr) {
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
export function toUTF8(str, cesu8) {
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
export { PromiseBuffer };
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
export { PromiseQueue };
export function toHex(bytes) {
    var r = "";
    for (var i = 0; i < bytes.length; ++i)
        r += ("0" + bytes[i].toString(16)).slice(-2);
    return r;
}
export function fromHex(hex) {
    var r = new Uint8Array(hex.length >> 1);
    for (var i = 0; i < hex.length; i += 2)
        r[i >> 1] = parseInt(hex.slice(i, i + 2), 16);
    return r;
}
export function write32(buf, pos, v) {
    buf[pos + 0] = (v >> 0) & 0xff;
    buf[pos + 1] = (v >> 8) & 0xff;
    buf[pos + 2] = (v >> 16) & 0xff;
    buf[pos + 3] = (v >> 24) & 0xff;
}
export function write16(buf, pos, v) {
    buf[pos + 0] = (v >> 0) & 0xff;
    buf[pos + 1] = (v >> 8) & 0xff;
}
export function read32(buf, pos) {
    return (buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16) | (buf[pos + 3] << 24)) >>> 0;
}
export function read16(buf, pos) {
    return buf[pos] | (buf[pos + 1] << 8);
}
export function encodeU32LE(words) {
    var r = new Uint8Array(words.length * 4);
    for (var i = 0; i < words.length; ++i)
        write32(r, i * 4, words[i]);
    return r;
}
export function decodeU32LE(buf) {
    var res = [];
    for (var i = 0; i < buf.length; i += 4)
        res.push(read32(buf, i));
    return res;
}
export function getNumber(buf, fmt, offset) {
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
export function bufferToString(buf) {
    return fromUTF8(uint8ArrayToString(buf));
}
export function bufferConcat(a, b) {
    var r = new Uint8Array(a.length + b.length);
    r.set(a, 0);
    r.set(b, a.length);
    return r;
}
export function jsonCopyFrom(trg, src) {
    var v = clone(src);
    for (var _i = 0, _a = Object.keys(src); _i < _a.length; _i++) {
        var k = _a[_i];
        trg[k] = v[k];
    }
}
export function assert(cond, msg) {
    if (msg === void 0) { msg = "Assertion failed"; }
    if (!cond) {
        debugger;
        throw new Error(msg);
    }
}
export function flatClone(obj) {
    if (obj == null)
        return null;
    var r = {};
    Object.keys(obj).forEach(function (k) { r[k] = obj[k]; });
    return r;
}
export function clone(v) {
    if (v == null)
        return null;
    return JSON.parse(JSON.stringify(v));
}
//# sourceMappingURL=utils.js.map
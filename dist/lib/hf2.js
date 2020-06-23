"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
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
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Proto = exports.Transport = exports.HF2_EV_JDS_PACKET = exports.HF2_CMD_JDS_SEND = exports.HF2_CMD_JDS_CONFIG = exports.HF2_EV_MASK = exports.HF2_STATUS_EVENT = exports.HF2_STATUS_EXEC_ERR = exports.HF2_STATUS_INVALID_CMD = exports.HF2_STATUS_OK = exports.HF2_SIZE_MASK = exports.HF2_FLAG_MASK = exports.HF2_FLAG_CMDPKT_BODY = exports.HF2_FLAG_CMDPKT_LAST = exports.HF2_FLAG_SERIAL_ERR = exports.HF2_FLAG_SERIAL_OUT = exports.HF2_CMD_DMESG = exports.HF2_CMD_WRITE_WORDS = exports.HF2_CMD_READ_WORDS = exports.HF2_CMD_CHKSUM_PAGES = exports.HF2_CMD_WRITE_FLASH_PAGE = exports.HF2_CMD_START_FLASH = exports.HF2_CMD_RESET_INTO_BOOTLOADER = exports.HF2_CMD_RESET_INTO_APP = exports.HF2_CMD_INFO = exports.HF2_MODE_USERSPACE = exports.HF2_MODE_BOOTLOADER = exports.HF2_CMD_BININFO = void 0;
var U = require("./utils");
var controlTransferGetReport = 0x01;
var controlTransferSetReport = 0x09;
var controlTransferOutReport = 0x200;
var controlTransferInReport = 0x100;
// see https://github.com/microsoft/uf2/blob/master/hf2.md for full spec
exports.HF2_CMD_BININFO = 0x0001; // no arguments
exports.HF2_MODE_BOOTLOADER = 0x01;
exports.HF2_MODE_USERSPACE = 0x02;
/*
struct HF2_BININFO_Result {
    uint32_t mode;
    uint32_t flash_page_size;
    uint32_t flash_num_pages;
    uint32_t max_message_size;
};
*/
exports.HF2_CMD_INFO = 0x0002;
// no arguments
// results is utf8 character array
exports.HF2_CMD_RESET_INTO_APP = 0x0003; // no arguments, no result
exports.HF2_CMD_RESET_INTO_BOOTLOADER = 0x0004; // no arguments, no result
exports.HF2_CMD_START_FLASH = 0x0005; // no arguments, no result
exports.HF2_CMD_WRITE_FLASH_PAGE = 0x0006;
/*
struct HF2_WRITE_FLASH_PAGE_Command {
    uint32_t target_addr;
    uint32_t data[flash_page_size];
};
*/
// no result
exports.HF2_CMD_CHKSUM_PAGES = 0x0007;
/*
struct HF2_CHKSUM_PAGES_Command {
    uint32_t target_addr;
    uint32_t num_pages;
};
struct HF2_CHKSUM_PAGES_Result {
    uint16_t chksums[num_pages];
};
*/
exports.HF2_CMD_READ_WORDS = 0x0008;
/*
struct HF2_READ_WORDS_Command {
    uint32_t target_addr;
    uint32_t num_words;
};
struct HF2_READ_WORDS_Result {
    uint32_t words[num_words];
};
*/
exports.HF2_CMD_WRITE_WORDS = 0x0009;
/*
struct HF2_WRITE_WORDS_Command {
    uint32_t target_addr;
    uint32_t num_words;
    uint32_t words[num_words];
};
*/
// no result
exports.HF2_CMD_DMESG = 0x0010;
// no arguments
// results is utf8 character array
exports.HF2_FLAG_SERIAL_OUT = 0x80;
exports.HF2_FLAG_SERIAL_ERR = 0xC0;
exports.HF2_FLAG_CMDPKT_LAST = 0x40;
exports.HF2_FLAG_CMDPKT_BODY = 0x00;
exports.HF2_FLAG_MASK = 0xC0;
exports.HF2_SIZE_MASK = 63;
exports.HF2_STATUS_OK = 0x00;
exports.HF2_STATUS_INVALID_CMD = 0x01;
exports.HF2_STATUS_EXEC_ERR = 0x02;
exports.HF2_STATUS_EVENT = 0x80;
// the eventId is overlayed on the tag+status; the mask corresponds
// to the HF2_STATUS_EVENT above
exports.HF2_EV_MASK = 0x800000;
exports.HF2_CMD_JDS_CONFIG = 0x0020;
exports.HF2_CMD_JDS_SEND = 0x0021;
exports.HF2_EV_JDS_PACKET = 0x800020;
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
            return U.delay(500);
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
                        if (!true) return [3 /*break*/, 10];
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
                    return [4 /*yield*/, U.delay(5)];
                    case 5:
                        // throttle down if no data coming
                        _a.sent();
                        _a.label = 6;
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        err_1 = _a.sent();
                        if (this.dev)
                            this.onError(err_1);
                        return [4 /*yield*/, U.delay(300)];
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
        U.assert(pkt.length <= 64);
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
                            U.assert(this.epIn.packetSize == 64);
                            U.assert(this.epOut.packetSize == 64);
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
exports.Transport = Transport;
var Proto = /** @class */ (function () {
    function Proto(io) {
        var _this = this;
        this.io = io;
        this.eventHandlers = {};
        this.msgs = new U.PromiseBuffer();
        this.cmdSeq = (Math.random() * 0xffff) | 0;
        this.lock = new U.PromiseQueue();
        var frames = [];
        io.onData = function (buf) {
            var tp = buf[0] & exports.HF2_FLAG_MASK;
            var len = buf[0] & 63;
            //console.log(`msg tp=${tp} len=${len}`)
            var frame = new Uint8Array(len);
            U.memcpy(frame, 0, buf, 1, len);
            if (tp & exports.HF2_FLAG_SERIAL_OUT) {
                _this.onSerial(frame, tp == exports.HF2_FLAG_SERIAL_ERR);
                return;
            }
            frames.push(frame);
            if (tp == exports.HF2_FLAG_CMDPKT_BODY) {
                return;
            }
            else {
                U.assert(tp == exports.HF2_FLAG_CMDPKT_LAST);
                var total = 0;
                for (var _i = 0, frames_1 = frames; _i < frames_1.length; _i++) {
                    var f = frames_1[_i];
                    total += f.length;
                }
                var r = new Uint8Array(total);
                var ptr = 0;
                for (var _a = 0, frames_2 = frames; _a < frames_2.length; _a++) {
                    var f = frames_2[_a];
                    U.memcpy(r, ptr, f);
                    ptr += f.length;
                }
                frames = [];
                if (r[2] & exports.HF2_STATUS_EVENT) {
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
        U.write32(pkt, 0, cmd);
        U.write16(pkt, 4, seq);
        U.write16(pkt, 6, 0);
        if (data)
            U.memcpy(pkt, 8, data, 0, data.length);
        var numSkipped = 0;
        var handleReturnAsync = function () {
            return _this.msgs.shiftAsync(1000) // we wait up to a second
                .then(function (res) {
                if (U.read16(res, 0) != seq) {
                    if (numSkipped < 3) {
                        numSkipped++;
                        _this.io.log("message out of sync, (" + seq + " vs " + U.read16(res, 0) + "); will re-try");
                        return handleReturnAsync();
                    }
                    _this.error("out of sync");
                }
                var info = "";
                if (res[3])
                    info = "; info=" + res[3];
                switch (res[2]) {
                    case exports.HF2_STATUS_OK:
                        return res.slice(4);
                    case exports.HF2_STATUS_INVALID_CMD:
                        _this.error("invalid command" + info);
                        break;
                    case exports.HF2_STATUS_EXEC_ERR:
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
                frame[0] = exports.HF2_FLAG_CMDPKT_BODY;
            }
            else {
                frame[0] = exports.HF2_FLAG_CMDPKT_LAST;
            }
            if (serial)
                frame[0] = serial == 1 ? exports.HF2_FLAG_SERIAL_OUT : exports.HF2_FLAG_SERIAL_ERR;
            frame[0] |= len;
            for (var i = 0; i < len; ++i)
                frame[i + 1] = buf[pos + i];
            return _this.io.sendPacketAsync(frame)
                .then(function () { return loop(pos + len); });
        };
        return loop(0);
    };
    Proto.prototype.onEvent = function (id, f) {
        U.assert(!!(id & exports.HF2_EV_MASK));
        this.eventHandlers[id + ""] = f;
    };
    Proto.prototype.onJDMessage = function (f) {
        this.talkAsync(exports.HF2_CMD_JDS_CONFIG, U.encodeU32LE([1]));
        this.onEvent(exports.HF2_EV_JDS_PACKET, f);
    };
    Proto.prototype.sendJDMessageAsync = function (buf) {
        return this.talkAsync(exports.HF2_CMD_JDS_SEND, buf);
    };
    Proto.prototype.handleEvent = function (buf) {
        var evid = U.read32(buf, 0);
        var f = this.eventHandlers[evid + ""];
        if (f) {
            f(buf.slice(4));
        }
        else {
            this.io.log("unhandled event: " + evid.toString(16));
        }
    };
    Proto.prototype.onSerial = function (data, iserr) {
        console.log("SERIAL:", U.bufferToString(data));
    };
    Proto.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var buf;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.io.init()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.talkAsync(exports.HF2_CMD_INFO)];
                    case 2:
                        buf = _a.sent();
                        this.io.log("Connected to: " + U.bufferToString(buf));
                        return [2 /*return*/];
                }
            });
        });
    };
    return Proto;
}());
exports.Proto = Proto;
//# sourceMappingURL=hf2.js.map
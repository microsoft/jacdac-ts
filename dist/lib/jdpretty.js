"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLog = exports.printPkt = void 0;
var U = require("./pxtutils");
var jd = require("./jd");
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
        return pri + " \"" + U.bufferToString(pkt.data) + "\"";
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
    return toHex(n);
}
function serviceName(n) {
    if (n == null)
        return "?";
    return reverseLookup(service_classes, n);
}
function commandName(n) {
    var pref = "";
    if ((n & jd.CMD_TOP_MASK) == jd.CMD_SET_REG)
        pref = "SET[";
    else if ((n & jd.CMD_TOP_MASK) == jd.CMD_GET_REG)
        pref = "GET[";
    if (pref) {
        var reg = n & jd.CMD_REG_MASK;
        return pref + reverseLookup(generic_regs, reg) + "]";
    }
    return reverseLookup(generic_commands, n);
}
function toHex(n) {
    return "0x" + n.toString(16);
}
function num2str(n) {
    return n + " (0x" + n.toString(16) + ")";
}
function printPkt(pkt, opts) {
    var _a;
    if (opts === void 0) { opts = {}; }
    var frame_flags = pkt._header[3];
    var devname = pkt.dev ? pkt.dev.name || pkt.dev.shortId : pkt.device_identifier;
    if (frame_flags & jd.JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS)
        devname = "[mul] " + serviceName(pkt.multicommand_class);
    var serv_id = serviceName((_a = pkt === null || pkt === void 0 ? void 0 : pkt.dev) === null || _a === void 0 ? void 0 : _a.serviceAt(pkt.service_number));
    var service_name = serv_id + " (" + pkt.service_number + ")";
    var cmd = pkt.service_command;
    var cmdname = commandName(cmd);
    if (pkt.service_number == jd.JD_SERVICE_NUMBER_CRC_ACK) {
        service_name = "CRC-ACK";
        cmdname = toHex(cmd);
    }
    if (pkt.service_number == jd.JD_SERVICE_NUMBER_STREAM) {
        service_name = "STREAM";
        cmdname = "port:" + (cmd >> jd.STREAM_PORT_SHIFT) + " cnt:" + (cmd & jd.STREAM_COUNTER_MASK);
        if (cmd & jd.STREAM_METADATA_MASK)
            cmdname += " meta";
        if (cmd & jd.STREAM_CLOSE_MASK)
            cmdname += " close";
    }
    var pdesc = devname + "/" + service_name + ": " + cmdname + "; sz=" + pkt.size;
    if (frame_flags & jd.JD_FRAME_FLAG_COMMAND)
        pdesc = 'to ' + pdesc;
    else
        pdesc = 'from ' + pdesc;
    if (frame_flags & jd.JD_FRAME_FLAG_ACK_REQUESTED)
        pdesc = "[ack:" + toHex(pkt.crc) + "] " + pdesc;
    var d = pkt.data;
    if (pkt.dev && pkt.service_number == 0 && pkt.service_command == jd.CMD_ADVERTISEMENT_DATA) {
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
        if (pkt.dev && !pkt.is_command && pkt.service_command == (jd.CMD_GET_REG | jd.REG_READING)) {
            if (opts.skipRepeatedReading && pkt.dev.currentReading && U.bufferEq(pkt.dev.currentReading, pkt.data))
                return "";
            pkt.dev.currentReading = pkt.data;
        }
        var decoder = serv_decoders[serv_id];
        var decoded = decoder ? decoder(pkt) : null;
        if (decoded) {
            pdesc += "; " + decoded;
        }
        else if (pkt.service_command == jd.CMD_EVENT) {
            pdesc += "; ev=" + num2str(pkt.intData) + " arg=" + (U.read32(pkt.data, 4) | 0);
        }
        else if (0 < d.length && d.length <= 4) {
            var v0 = pkt.uintData, v1 = pkt.intData;
            pdesc += "; " + num2str(v0);
            if (v0 != v1)
                pdesc += "; signed: " + num2str(v1);
        }
        else if (d.length) {
            pdesc += "; " + U.toHex(d);
        }
    }
    return Math.round(pkt.timestamp) + "ms: " + pdesc;
}
exports.printPkt = printPkt;
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
                data: U.fromHex(m[2])
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
exports.parseLog = parseLog;
//# sourceMappingURL=jdpretty.js.map
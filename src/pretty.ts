import * as U from "./utils"
import * as jd from "./constants"
import { Packet } from "./packet"
import { Device } from "./device"

const service_classes: U.SMap<number> = {
    "<disabled>": -1,
    CTRL: 0,
    LOGGER: jd.JD_SERVICE_LOGGER,
    BATTERY: jd.JD_SERVICE_BATTERY,
    ACCELEROMETER: jd.JD_SERVICE_ACCELEROMETER,
    BUTTON: jd.JD_SERVICE_BUTTON,
    TOUCHBUTTON: jd.JD_SERVICE_TOUCHBUTTON,
    LIGHT_SENSOR: jd.JD_SERVICE_LIGHT_SENSOR,
    MICROPHONE: jd.JD_SERVICE_MICROPHONE,
    THERMOMETER: jd.JD_SERVICE_THERMOMETER,
    SWITCH: jd.JD_SERVICE_SWITCH,
    PIXEL: jd.JD_SERVICE_PIXEL,
    HAPTIC: jd.JD_SERVICE_HAPTIC,
    LIGHT: jd.JD_SERVICE_LIGHT,
    KEYBOARD: jd.JD_SERVICE_KEYBOARD,
    MOUSE: jd.JD_SERVICE_MOUSE,
    GAMEPAD: jd.JD_SERVICE_GAMEPAD,
    MUSIC: jd.JD_SERVICE_MUSIC,
    SERVO: jd.JD_SERVICE_SERVO,
    CONTROLLER: jd.JD_SERVICE_CONTROLLER,
    LCD: jd.JD_SERVICE_LCD,
    MESSAGE_BUS: jd.JD_SERVICE_MESSAGE_BUS,
    COLOR_SENSOR: jd.JD_SERVICE_COLOR_SENSOR,
    LIGHT_SPECTRUM_SENSOR: jd.JD_SERVICE_LIGHT_SPECTRUM_SENSOR,
    PROXIMITY: jd.JD_SERVICE_PROXIMITY,
    TOUCH_BUTTONS: jd.JD_SERVICE_TOUCH_BUTTONS,
    SERVOS: jd.JD_SERVICE_SERVOS,
    ROTARY_ENCODER: jd.JD_SERVICE_ROTARY_ENCODER,
    DNS: jd.JD_SERVICE_DNS,
    PWM_LIGHT: jd.JD_SERVICE_PWM_LIGHT,
    BOOTLOADER: jd.JD_SERVICE_BOOTLOADER,
    ARCADE_CONTROLS: jd.JD_SERVICE_ARCADE_CONTROLS,
    POWER: jd.JD_SERVICE_POWER,
    SLIDER: jd.JD_SERVICE_SLIDER,
    MOTOR: jd.JD_SERVICE_MOTOR,
    TCP: jd.JD_SERVICE_TCP,
    WIFI: jd.JD_SERVICE_WIFI,
}

const generic_commands: U.SMap<number> = {
    CMD_ADVERTISEMENT_DATA: 0x00,
    CMD_EVENT: 0x01,
    CMD_CALIBRATE: 0x02,
    CMD_GET_DESCRIPTION: 0x03,
    /*
    CMD_CTRL_NOOP: 0x80,
    CMD_CTRL_IDENTIFY: 0x81,
    CMD_CTRL_RESET: 0x82,
    */
}

const generic_regs: U.SMap<number> = {
    REG_INTENSITY: 0x01,
    REG_VALUE: 0x02,
    REG_IS_STREAMING: 0x03,
    REG_STREAMING_INTERVAL: 0x04,
    REG_LOW_THRESHOLD: 0x05,
    REG_HIGH_THRESHOLD: 0x06,
    REG_MAX_POWER: 0x07,
    REG_READING: 0x101
}

const serv_decoders: U.SMap<(p: Packet) => string> = {
    LOGGER: (pkt: Packet) => {
        const pri = priority()
        if (!pri) return null
        return `${pri} "${U.bufferToString(pkt.data)}"`

        function priority() {
            switch (pkt.service_command) {
                case 0x80: return "dbg"
                case 0x81: return "log"
                case 0x82: return "warn"
                case 0x83: return "err"
                default: return null
            }
        }
    }
}

export function decodePacketData(pkt: Packet): string {
    const serv_id = serviceName(pkt?.dev?.serviceClassAt(pkt.service_number));
    const decoder = serv_decoders[serv_id];
    const decoded = decoder ? decoder(pkt) : null
    return decoded;
}

function reverseLookup(map: U.SMap<number>, n: number) {
    for (let k of Object.keys(map)) {
        if (map[k] == n)
            return k
    }
    return toHex(n)
}

export function serviceName(n: number) {
    if (n == null)
        return "?"
    return reverseLookup(service_classes, n)
}

export function commandName(n: number) {
    let pref = ""
    if ((n & jd.CMD_TOP_MASK) == jd.CMD_SET_REG) pref = "SET["
    else if ((n & jd.CMD_TOP_MASK) == jd.CMD_GET_REG) pref = "GET["
    if (pref) {
        const reg = n & jd.CMD_REG_MASK
        return pref + reverseLookup(generic_regs, reg) + "]"
    }
    return reverseLookup(generic_commands, n)
}

function toHex(n: number) {
    return "0x" + n.toString(16)
}

function num2str(n: number) {
    return n + " (0x" + n.toString(16) + ")"
}

export interface Options {
    skipRepeatedAnnounce?: boolean;
    skipRepeatedReading?: boolean;
}

export function printServices(device: Device) {
    let srv = ""
    const n = device.serviceLength;
    for (let i = 0; i < n; ++i) {
        const id = device.serviceClassAt(i);
        const name = serviceName(id);
        if (i) srv += ", "
        srv += name;
    }
    return srv;
}

export function printPacket(pkt: Packet, opts: Options = {}): string {
    const frame_flags = pkt._header[3]

    let devname = pkt.dev ? pkt.dev.name || pkt.dev.shortId : pkt.device_identifier

    if (frame_flags & jd.JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS)
        devname = "[mul] " + serviceName(pkt.multicommand_class)

    const serv_id = serviceName(pkt?.dev?.serviceClassAt(pkt.service_number))
    let service_name = `${serv_id} (${pkt.service_number})`
    const cmd = pkt.service_command
    let cmdname = commandName(cmd)
    if (pkt.service_number == jd.JD_SERVICE_NUMBER_CRC_ACK) {
        service_name = "CRC-ACK"
        cmdname = toHex(cmd)
    }
    if (pkt.service_number == jd.JD_SERVICE_NUMBER_STREAM) {
        service_name = "STREAM"
        cmdname = `port:${cmd >> jd.STREAM_PORT_SHIFT} cnt:${cmd & jd.STREAM_COUNTER_MASK}`
        if (cmd & jd.STREAM_METADATA_MASK)
            cmdname += " meta"
        if (cmd & jd.STREAM_CLOSE_MASK)
            cmdname += " close"
    }

    let pdesc = `${devname}/${service_name}: ${cmdname}; sz=${pkt.size}`

    if (frame_flags & jd.JD_FRAME_FLAG_COMMAND)
        pdesc = 'to ' + pdesc
    else
        pdesc = 'from ' + pdesc
    if (frame_flags & jd.JD_FRAME_FLAG_ACK_REQUESTED)
        pdesc = `[ack:${toHex(pkt.crc)}] ` + pdesc

    const d = pkt.data
    if (pkt.dev && pkt.service_number == 0 && pkt.service_command == jd.CMD_ADVERTISEMENT_DATA) {
        if (pkt.dev.lastServiceUpdate < pkt.timestamp) {
            if (opts.skipRepeatedAnnounce)
                return ""
            else
                pdesc = " ====== " + pdesc
        } else {
            const services = []
            for (let i = 0; i < pkt.dev.services.length >> 2; i++) {
                services.push(serviceName(pkt.dev.serviceClassAt(i)))
            }
            pdesc += "; " + "Announce services: " + services.join(", ")
        }
    } else {
        if (pkt.dev && !pkt.is_command && pkt.service_command == (jd.CMD_GET_REG | jd.REG_READING)) {
            if (opts.skipRepeatedReading && pkt.dev.currentReading && U.bufferEq(pkt.dev.currentReading, pkt.data))
                return ""
            pkt.dev.currentReading = pkt.data
        }

        const decoder = serv_decoders[serv_id]
        const decoded = decoder ? decoder(pkt) : null
        if (decoded) {
            pdesc += "; " + decoded
        } else if (pkt.service_command == jd.CMD_EVENT) {
            pdesc += "; ev=" + num2str(pkt.intData) + " arg=" + (U.read32(pkt.data, 4) | 0)
        } else if (0 < d.length && d.length <= 4) {
            let v0 = pkt.uintData, v1 = pkt.intData
            pdesc += "; " + num2str(v0)
            if (v0 != v1)
                pdesc += "; signed: " + num2str(v1)
        } else if (d.length) {
            pdesc += "; " + U.toHex(d)
        }
    }

    return (!isNaN(pkt.timestamp) ? Math.round(pkt.timestamp) + "ms: " : "") + pdesc
}

export interface ParsedFrame {
    timestamp: number
    data: Uint8Array
    info?: string
}

export function parseLog(logcontents: string) {
    const res: ParsedFrame[] = []
    let frameBytes = []
    let lastTime = 0
    for (let ln of logcontents.split(/\r?\n/)) {
        let m = /^JD (\d+) ([0-9a-f]+)/i.exec(ln)
        if (m) {
            res.push({
                timestamp: parseInt(m[1]),
                data: U.fromHex(m[2])
            })
            continue
        }

        m = /^([\d\.]+),Async Serial,.*(0x[A-F0-9][A-F0-9])/.exec(ln)
        if (!m)
            continue
        const tm = parseFloat(m[1])
        if (lastTime && tm - lastTime > 0.1) {
            res.push({
                timestamp: lastTime * 1000,
                data: new Uint8Array(frameBytes),
                info: "timeout"
            })
            frameBytes = []
            lastTime = 0
        }

        lastTime = tm
        if (ln.indexOf("framing error") > 0) {
            if (frameBytes.length > 0)
                res.push({
                    timestamp: lastTime * 1000,
                    data: new Uint8Array(frameBytes),
                })
            frameBytes = []
            lastTime = 0
        } else {
            frameBytes.push(parseInt(m[2]))
        }
    }

    return res
}


import * as U from "./utils"
import * as jd from "./constants"
import { Packet } from "./packet"
import { Device } from "./device"
import { intOfBuffer, bufferToArray, NumberFormat } from "./buffer"
import { unpack } from "./struct"

const service_classes: U.SMap<number> = {
    "<disabled>": -1,
    CTRL: 0,
    LOGGER: jd.SRV_LOGGER,
    BATTERY: jd.SRV_BATTERY,
    ACCELEROMETER: jd.SRV_ACCELEROMETER,
    BUTTON: jd.SRV_BUTTON,
    TOUCHBUTTON: jd.SRV_TOUCHBUTTON,
    LIGHT_SENSOR: jd.SRV_LIGHT_SENSOR,
    MICROPHONE: jd.SRV_MICROPHONE,
    THERMOMETER: jd.SRV_THERMOMETER,
    SWITCH: jd.SRV_SWITCH,
    PIXEL: jd.SRV_PIXEL,
    HAPTIC: jd.SRV_HAPTIC,
    LIGHT: jd.SRV_LIGHT,
    KEYBOARD: jd.SRV_KEYBOARD,
    MOUSE: jd.SRV_MOUSE,
    GAMEPAD: jd.SRV_GAMEPAD,
    MUSIC: jd.SRV_MUSIC,
    SERVO: jd.SRV_SERVO,
    CONTROLLER: jd.SRV_CONTROLLER,
    LCD: jd.SRV_LCD,
    MESSAGE_BUS: jd.SRV_MESSAGE_BUS,
    COLOR_SENSOR: jd.SRV_COLOR_SENSOR,
    LIGHT_SPECTRUM_SENSOR: jd.SRV_LIGHT_SPECTRUM_SENSOR,
    PROXIMITY: jd.SRV_PROXIMITY,
    TOUCH_BUTTONS: jd.SRV_TOUCH_BUTTONS,
    SERVOS: jd.SRV_SERVOS,
    ROTARY_ENCODER: jd.SRV_ROTARY_ENCODER,
    DNS: jd.SRV_DNS,
    PWM_LIGHT: jd.SRV_PWM_LIGHT,
    BOOTLOADER: jd.SRV_BOOTLOADER,
    ARCADE_CONTROLS: jd.SRV_ARCADE_CONTROLS,
    POWER: jd.SRV_POWER,
    SLIDER: jd.SRV_SLIDER,
    MOTOR: jd.SRV_MOTOR,
    TCP: jd.SRV_TCP,
    WIFI: jd.SRV_WIFI,
    MULTITOUCH: jd.SRV_MULTITOUCH,
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

function decodeIntSensorData(pkt: Packet) {
    const value = intOfBuffer(pkt.data)
    return value.toString();
}

function decodeBootloader(pkt: Packet) {
    if (pkt.service_command == 0x80) {
        if (pkt.is_command) {
            const [pageAddr, suboff, currsubpage, maxSubpage, session] = unpack(pkt.data, "IHBBI")
            const hdsize = 4 * 7
            return `write page=${toHex(pageAddr)}+${suboff} ${currsubpage}/${maxSubpage} session=${toHex(session)} data=` +
                U.toHex(pkt.data.slice(hdsize, hdsize + 10)) + "..."
        } else {
            const [sess, berr, pageAddr] = unpack(pkt.data, "III")
            return `status page=${toHex(pageAddr)} session=${toHex(sess)} err=${toHex(berr)}`
        }
    } else if (pkt.service_command == 0x81) {
        return `set session ${toHex(pkt.uintData)}`
    } else if (pkt.service_command == 0x00) {
        const [magic, pageSize, flashSize, devClass] = unpack(pkt.data, "4I")
        return `magic:${toHex(magic)} pageSize:${pageSize} flashSize:${flashSize} devClass:${toHex(devClass)}`
    } else {
        return null
    }
}

export enum RegisterType {
    UInt, // default
    UIntHex,
    Int,
    IntArray,
    String,
}

export interface RegisterInfo {
    addr: number;
    name: string;
    type?: RegisterType;
    unit?: string;
    div?: number;
}

export function lookupRegisterInfo(regs: RegisterInfo[], pkt: Packet) {
    if (pkt.service_command & (jd.CMD_GET_REG | jd.CMD_SET_REG)) {
        const addr = pkt.service_command & jd.CMD_REG_MASK
        return regs.find(r => r.addr == addr) || undefined
    } else {
        return null
    }
}

const common_regs: RegisterInfo[] = [
    { addr: 0x01, name: "intensity" },
    { addr: 0x02, name: "value" },
    { addr: 0x03, name: "is_streaming" },
    { addr: 0x04, name: "streaming_interval", unit: "us" },
    { addr: 0x05, name: "low_threshold" },
    { addr: 0x05, name: "high_threshold" },
    { addr: 0x01, name: "max_power", unit: "mA" },
]

export function decodeRegister(regs: RegisterInfo[], pkt: Packet) {
    const regInfo = lookupRegisterInfo(regs, pkt) || lookupRegisterInfo(common_regs, pkt)
    if (!regInfo) return null
    let value = undefined
    const isGet = !!(pkt.service_command & jd.CMD_GET_REG)
    let useHex = false
    if (pkt.data.length) {
        let tp = regInfo.type
        if (tp == null)
            tp = pkt.data.length > 4 ? RegisterType.IntArray : RegisterType.UInt
        switch (tp) {
            case RegisterType.UInt:
                value = pkt.uintData
                break
            case RegisterType.UIntHex:
                value = pkt.uintData
                useHex = true
                break
            case RegisterType.Int:
                value = pkt.intData
                break
            case RegisterType.String:
                value = U.bufferToString(pkt.data)
                break
            case RegisterType.IntArray:
                value = bufferToArray(pkt.data, NumberFormat.Int32LE)
                break
        }
    }
    const scaledValue =
        Array.isArray(value) ? value.map(v => v / (regInfo.div || 1)) :
            typeof value == "number" ? value / (regInfo.div || 1) : undefined
    let humanValue = ""
    if (useHex)
        humanValue = "0x" + scaledValue.toString(16)
    else if (Array.isArray(scaledValue))
        humanValue = scaledValue.join(", ")
    else if (scaledValue !== undefined)
        humanValue = scaledValue + ""
    else if (value !== undefined)
        humanValue = value + ""
    if (humanValue && regInfo.unit) humanValue += regInfo.unit
    let description = isGet ? "GET " : "SET "
    description += regInfo.name
    if (humanValue)
        description += ": " + humanValue

    return {
        regInfo,
        value,
        scaledValue,
        humanValue,
        description,
    }
}

const ctrl_regs: RegisterInfo[] = [
    { addr: 0x180, name: "device_description", type: RegisterType.String },
    { addr: 0x181, name: "device_class", type: RegisterType.UIntHex },
    { addr: 0x182, name: "temperture", type: RegisterType.Int, unit: "°C" },
    { addr: 0x184, name: "device_class_bl", type: RegisterType.UIntHex },
    { addr: 0x185, name: "firmware_version", type: RegisterType.String },
    { addr: 0x186, name: "uptime", unit: "ms", div: 1000, type: RegisterType.UInt },
]

function decodeCtrlData(pkt: Packet) {
    const reg = decodeRegister(ctrl_regs, pkt)
    if (reg)
        return reg.description
    return null
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
    },
    SLIDER: decodeIntSensorData,
    THERMOMETER: decodeIntSensorData,
    POWER: decodeIntSensorData,
    BUTTON: decodeIntSensorData,
    ROTARY_ENCODER: decodeIntSensorData,
    BATTERY: decodeIntSensorData,
    BOOTLOADER: decodeBootloader,
    CTRL: decodeCtrlData,
}

export function decodePacketData(pkt: Packet): string {
    const srv_class = pkt?.multicommand_class || pkt?.dev?.serviceClassAt(pkt.service_number);
    const serv_id = serviceName(srv_class);
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

export function serviceClass(name: string) {
    return service_classes[(name || "").toUpperCase()];
}

export function serviceName(n: number) {
    if (n == null)
        return "?"
    return reverseLookup(service_classes, n)
}

export function deviceServiceName(pkt: Packet): string {
    const srv_class = pkt?.dev?.serviceClassAt(pkt.service_number);
    const serv_id = serviceName(srv_class);
    return `${pkt?.dev?.shortId || "?"}/${serv_id}:${pkt.service_number}`
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
}

export function printServices(device: Device) {
    let srv = ""
    const n = device.serviceLength;
    for (let i = 0; i < n; ++i) {
        const id = device.serviceClassAt(i);
        const name = `${i}:${serviceName(id)}`;
        if (i) srv += ", "
        srv += name;
    }
    return srv;
}

export function printPacket(pkt: Packet, opts: Options = {}): string {
    const frame_flags = pkt._header[3]

    let devname = pkt.dev ? pkt.dev.name || pkt.dev.shortId : pkt.device_identifier

    if (frame_flags & jd.JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS)
        devname = "[multicmd]"

    const serv_id = serviceName(pkt?.multicommand_class || pkt?.dev?.serviceClassAt(pkt.service_number))
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
            for (const sc of pkt.dev.serviceClasses)
                services.push(serviceName(sc))
            pdesc += "; " + "Announce services: " + services.join(", ")
        }
    } else {
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

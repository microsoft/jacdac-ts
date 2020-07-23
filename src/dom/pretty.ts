import * as U from "./utils"
import * as jd from "./constants"
import { Packet } from "./packet"
import { JDDevice, shortDeviceId } from "./device"
import * as spec from "./spec"
import { NumberFormat } from "./buffer"

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

export enum RegisterType {
    UInt, // default
    UIntHex,
    Int,
    IntArray,
    String,
}

export interface DecodedMember {
    info: jdspec.PacketMember
    value: any
    numValue: number
    scaledValue: number
    humanValue: string
    description: string
    size: number
}

export interface DecodedPacket {
    info: jdspec.PacketInfo
    decoded: DecodedMember[]
    description: string
}

export function prettyUnit(u: jdspec.Unit): string {
    switch (u) {
        case "us": return "μs"
        case "C": return "°C"
        case "frac": return "fraction"
        default: return u
    }
}

export function decodeMember(
    service: jdspec.ServiceSpec, pktInfo: jdspec.PacketInfo, member: jdspec.PacketMember,
    pkt: Packet, offset: number
): DecodedMember {
    if (!member)
        return null

    if (pkt.data.length <= offset)
        return null

    let numValue: number = undefined
    let scaledValue: number = undefined
    let value = undefined
    let humanValue: string = undefined
    let size = Math.abs(member.storage)

    const enumInfo = service.enums[member.type]
    const isInt = spec.isIntegerType(member.type) || !!enumInfo

    if (!isInt) {
        const buf = size ? pkt.data.slice(offset, offset + size) : pkt.data.slice(offset)
        if (member.type == "string") {
            try {
                value = U.fromUTF8(U.uint8ArrayToString(buf))
            } catch {
                // invalid UTF8
                value = U.uint8ArrayToString(buf)
            }
            humanValue = JSON.stringify(value).replace(/\\u0000/g, "\\0")
        } else if (member.type == "pipe") {
            value = buf
            const devid = U.toHex(buf.slice(0, 8))
            const port = U.read16(buf, 8)
            humanValue = "pipe to " + shortDeviceId(devid) + " port:" + port
            // + " [" + U.toHex(buf.slice(10)) + "]"
            if (pkt?.dev?.bus) {
                const trg = pkt.dev.bus.device(devid)
                trg.port(port).pipeType = service.shortId + "." + pktInfo.pipeType + ".report"
            }
        } else {
            value = buf
            humanValue = hexDump(buf)
        }
        size = buf.length
    } else {
        const fmt = spec.numberFormatFromStorageType(member.storage)
        numValue = pkt.getNumber(fmt, offset)
        value = scaledValue = spec.scaleValue(numValue, member.type)
        if (pkt.dev && member.type == "pipe_port")
            pkt.dev.port(value).pipeType = service.shortId + "." + pktInfo.pipeType + ".command"
        if (enumInfo) {
            if (enumInfo.isFlags) {
                humanValue = ""
                let curr = numValue
                for (const key of Object.keys(enumInfo.members)) {
                    const val = enumInfo.members[key]
                    if (curr & val) {
                        if (humanValue)
                            humanValue += " | "
                        humanValue += key
                        curr &= ~val
                    }
                }
                if (curr) {
                    if (humanValue)
                        humanValue += " | "
                    humanValue += hexNum(curr)
                }
            } else {
                humanValue = reverseLookup(enumInfo.members, numValue)
            }
        } else if (member.type == "bool") {
            value = !!numValue
            humanValue = value ? "true" : "false"
        } else if (member.unit || scaledValue != numValue)
            humanValue = scaledValue + prettyUnit(member.unit)
        else {
            humanValue = scaledValue + ""
            if ((scaledValue | 0) == scaledValue && scaledValue >= 15)
                humanValue += " (" + hexNum(scaledValue) + ")"
        }
    }

    return {
        value,
        numValue,
        scaledValue,
        humanValue,
        description: member.name + ":" +
            (humanValue.indexOf("\n") >= 0 ? "\n" + humanValue.replace(/^/gm, "      ") : " " + humanValue),
        info: member,
        size
    }
}

export function decodeMembers(service: jdspec.ServiceSpec, pktInfo: jdspec.PacketInfo, pkt: Packet, off = 0) {
    const fields = pktInfo.fields.slice(0)
    let idx = fields.findIndex(f => f.startRepeats)
    if (idx >= 0) {
        if (fields.some(f => !f.storage))
            throw new Error("zero-sized field in repeats:")
        let sz = 0
        for (const f of fields)
            sz += Math.abs(f.storage)
        // make sure we have enough fields to decode all data
        while (sz <= pkt.data.length) {
            const f = fields[idx++]
            sz += Math.abs(f.storage)
            fields.push(f)
        }
    }
    return fields.map(mem => {
        const decoded = decodeMember(service, pktInfo, mem, pkt, off)
        if (decoded)
            off += decoded.size
        return decoded
    }).filter(info => !!info)
}

export function wrapDecodedMembers(decoded: DecodedMember[]) {
    if (decoded.length == 0)
        return " {}"
    else if (decoded.length == 1 && decoded[0].description.length < 60)
        return " { " + decoded[0].description + " }"
    else
        return " {\n" + decoded.map(d => "    " + d.description).join("\n") + "\n}"
}

function syntheticPktInfo(kind: jdspec.PacketKind, addr: number): jdspec.PacketInfo {
    return {
        kind,
        identifier: addr,
        name: hexNum(addr),
        description: "",
        fields: [
            {
                name: "_",
                type: "bytes",
                unit: "",
                storage: 0
            }
        ]
    }
}

function decodeRegister(service: jdspec.ServiceSpec, pkt: Packet): DecodedPacket {
    const isSet = !!(pkt.service_command & jd.CMD_SET_REG)
    const isGet = !!(pkt.service_command & jd.CMD_GET_REG)

    if (isSet == isGet)
        return null

    const addr = pkt.service_command & jd.CMD_REG_MASK
    const regInfo =
        service.packets.find(p => spec.isRegister(p) && p.identifier == addr)
        || syntheticPktInfo("rw", addr)

    const decoded = decodeMembers(service, regInfo, pkt)

    let description = ""
    if (decoded.length == 0)
        description = regInfo.name
    else if (decoded.length == 1)
        description = regInfo.name + ": " + decoded[0].humanValue
    else
        description = wrapDecodedMembers(decoded)

    if (isGet)
        description = "GET " + description
    else
        description = "SET " + description

    return {
        info: regInfo,
        decoded,
        description,
    }
}

function decodeEvent(service: jdspec.ServiceSpec, pkt: Packet) {
    if (pkt.is_command || pkt.service_command != jd.CMD_EVENT)
        return null

    const addr = pkt.getNumber(NumberFormat.UInt32LE, 0)
    const evInfo = service.packets.find(p => p.kind == "event" && p.identifier == addr)
        || syntheticPktInfo("event", addr)

    const decoded = decodeMembers(service, evInfo, pkt, 4)
    let description = "EVENT " + evInfo.name + wrapDecodedMembers(decoded)

    return {
        info: evInfo,
        decoded,
        description,
    }
}

function decodeCommand(service: jdspec.ServiceSpec, pkt: Packet): DecodedPacket {
    const kind = pkt.is_command ? "command" : "report"
    const cmdInfo = service.packets.find(p => p.kind == kind && p.identifier == pkt.service_command)
        || syntheticPktInfo(kind, pkt.service_command)

    const decoded = decodeMembers(service, cmdInfo, pkt)
    const description = (pkt.is_command ? "CMD " : "REPORT ") + cmdInfo.name + wrapDecodedMembers(decoded)

    return {
        info: cmdInfo,
        decoded,
        description,
    }
}

function decodePacket(service: jdspec.ServiceSpec, pkt: Packet): DecodedPacket {
    return decodeRegister(service, pkt)
        || decodeEvent(service, pkt)
        || decodeCommand(service, pkt)
}

function decodePipe(pkt: Packet): DecodedPacket {
    const cmd = pkt.service_command
    const pinfo = pkt.dev.port(cmd >> jd.PIPE_PORT_SHIFT)
    if (!pinfo.pipeType)
        return null

    const [servId, pipeType, dir] = pinfo.pipeType.split(/\./)
    const service = spec.serviceSpecificationFromName(servId)
    if (!service)
        return null

    const meta = !!(cmd & jd.PIPE_METADATA_MASK)
    const candidates = service.packets
        .filter(p => p.pipeType == pipeType &&
            /pipe/.test(p.kind) &&
            /meta/.test(p.kind) == meta &&
            /command/.test(p.kind) == (dir == "command"))
        .filter(p => !meta || pkt.getNumber(NumberFormat.UInt16LE, 0) == p.identifier)

    const cmdInfo = candidates[0]
    if (cmdInfo) {
        const decoded = decodeMembers(service, cmdInfo, pkt, meta ? 4 : 0)
        const description = cmdInfo.kind.toUpperCase() + " " + cmdInfo.name + wrapDecodedMembers(decoded)
        return {
            info: cmdInfo,
            decoded,
            description,
        }
    }

    return null
}

export function decodePacketData(pkt: Packet): DecodedPacket {
    if (pkt.dev && pkt.service_number == jd.JD_SERVICE_NUMBER_PIPE) {
        const info = decodePipe(pkt)
        if (info)
            return info
    }

    const srv_class = pkt?.multicommand_class || pkt?.dev?.serviceClassAt(pkt.service_number);
    const service = spec.serviceSpecificationFromClassIdentifier(srv_class)
    if (!service)
        return null

    return decodePacket(service, pkt)
}

function reverseLookup(map: U.SMap<number>, n: number) {
    for (let k of Object.keys(map)) {
        if (map[k] == n)
            return k
    }
    return hexNum(n)
}

export function serviceClass(name: string): number {
    const serv = spec.serviceSpecificationFromName(name);
    return serv ? serv.classIdentifier : service_classes[(name || "").toUpperCase()];
}

export function serviceName(n: number): string {
    if (n == null)
        return "?"
    const serv = spec.serviceSpecificationFromClassIdentifier(n);
    return serv ? serv.name.toUpperCase() : reverseLookup(service_classes, n)
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

function hexNum(n: number) {
    if (n < 0)
        return "-" + hexNum(-n)
    return "0x" + n.toString(16)
}

function num2str(n: number) {
    return n + " (0x" + n.toString(16) + ")"
}

export interface Options {
    skipRepeatedAnnounce?: boolean;
}

export function printServices(device: JDDevice) {
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

export function toAscii(d: ArrayLike<number>) {
    let r = ""
    for (let i = 0; i < d.length; ++i) {
        const c = d[i]
        if (c < 32 || c >= 128)
            r += "."
        else
            r += String.fromCharCode(c)
    }
    return r
}

export function hexDump(d: ArrayLike<number>): string {
    const chunk = 32
    if (d.length <= chunk)
        return U.toHex(d) + "\u00A0|\u00A0" + toAscii(d)

    const a = U.toArray(d)
    let r = ""
    for (let i = 0; i < d.length; i += chunk) {
        if (i + chunk >= d.length) {
            let s = U.toHex(a.slice(i))
            while (s.length < chunk * 2)
                s += "  "
            r += s + "\u00A0|\u00A0" + toAscii(a.slice(i))
        } else {
            r += hexDump(a.slice(i, i + chunk)) + "\n"
        }
    }
    return r
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
        cmdname = hexNum(cmd)
    }
    if (pkt.service_number == jd.JD_SERVICE_NUMBER_PIPE) {
        service_name = "PIPE"
        cmdname = `port:${cmd >> jd.PIPE_PORT_SHIFT} cnt:${cmd & jd.PIPE_COUNTER_MASK}`
        if (cmd & jd.PIPE_METADATA_MASK)
            cmdname += " meta"
        if (cmd & jd.PIPE_CLOSE_MASK)
            cmdname += " close"
    }

    let pdesc = `${devname}/${service_name}: ${cmdname}; sz=${pkt.size}`

    if (frame_flags & jd.JD_FRAME_FLAG_COMMAND)
        pdesc = 'to ' + pdesc
    else
        pdesc = 'from ' + pdesc
    if (frame_flags & jd.JD_FRAME_FLAG_ACK_REQUESTED)
        pdesc = `[ack:${hexNum(pkt.crc)}] ` + pdesc

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
        const decoded = decodePacketData(pkt)
        if (decoded) {
            pdesc += "; " + decoded.description
        } else if (pkt.service_command == jd.CMD_EVENT) {
            pdesc += "; ev=" + num2str(pkt.intData) + " arg=" + (U.read32(pkt.data, 4) | 0)
        } else if (0 < d.length && d.length <= 4) {
            let v0 = pkt.uintData, v1 = pkt.intData
            pdesc += "; " + num2str(v0)
            if (v0 != v1)
                pdesc += "; signed: " + num2str(v1)
        } else if (d.length) {
            pdesc += "; " + hexDump(d)
        }
    }

    return (!isNaN(pkt.timestamp) ? Math.round(pkt.timestamp) + "ms: " : "") + pdesc
}

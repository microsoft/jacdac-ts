import Packet from "./packet"
import { NumberFormat } from "./buffer"
import { roundWithPrecision, SMap, idiv, fromHex, hash, fromUTF8, uint8ArrayToString, read16, toHex, read32, toArray, hexNum } from "./utils"
import { isIntegerType, numberFormatFromStorageType, scaleIntToFloat, isRegister, serviceSpecificationFromName, serviceSpecificationFromClassIdentifier } from "./spec"
import {
    JD_SERVICE_INDEX_PIPE, CMD_SET_REG, CMD_GET_REG, CMD_REG_MASK, CMD_EVENT, PIPE_METADATA_MASK, CMD_TOP_MASK, PIPE_PORT_SHIFT, JD_FRAME_FLAG_COMMAND,
    JD_FRAME_FLAG_ACK_REQUESTED, CMD_ADVERTISEMENT_DATA, JD_SERVICE_INDEX_CTRL
} from "./constants"
import { SystemCmd, SystemReg } from "../../jacdac-spec/dist/specconstants"

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
    service: jdspec.ServiceSpec;
    info: jdspec.PacketInfo;
    decoded: DecodedMember[];
    description: string;
}

export function prettyUnit(u: jdspec.Unit): string {
    switch (u) {
        case "us": return "μs";
        case "C":
        case "Cel": return "°C";
        case "K": return "°K";
        case "/": return "";
        default: return u
    }
}

export function prettySize(b: number) {
    b = b | 0;
    if (b < 1000)
        return b + 'b';
    else if (b < 1000000)
        return roundWithPrecision(b / 1e3, 1) + 'kb';
    else
        return roundWithPrecision(b / 1e6, 1) + 'mb';
}

export function prettyDuration(ms: number) {
    let s = ms / 1000
    if (s < 1)
        return `${roundWithPrecision(s, 2)}s`
    if (s < 10)
        return `${roundWithPrecision(s, 1)}s`
    if (s < 60)
        return `${Math.floor(s)}s`

    let r = "";
    const d = Math.floor(s / (24 * 3600))
    if (d > 0) {
        r += d + ":"
        s -= d * (24 * 3600)
    }
    const h = Math.floor(s / 3600)
    if (h > 0) {
        r += h + ":"
        s -= h * 3600
    }
    const m = Math.floor(s / 60)
    if (d > 0 || h > 0 || m > 0) {
        r += m + ":"
        s -= m * 60
    }
    r += Math.floor(s)
    return r;
}

// 2 letter + 2 digit ID; 1.8%/0.3%/0.07%/0.015% collision probability among 50/20/10/5 devices
export function shortDeviceId(devid: string) {
    const h = hash(fromHex(devid), 30)
    return String.fromCharCode(0x41 + h % 26) +
        String.fromCharCode(0x41 + idiv(h, 26) % 26) +
        String.fromCharCode(0x30 + idiv(h, 26 * 26) % 10) +
        String.fromCharCode(0x30 + idiv(h, 26 * 26 * 10) % 10)
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
    const isInt = isIntegerType(member.type) || !!enumInfo

    if (member.isFloat && (size == 4 || size == 8)) {
        if (size == 4)
            numValue = pkt.getNumber(NumberFormat.Float32LE, offset)
        else
            numValue = pkt.getNumber(NumberFormat.Float64LE, offset)
        value = scaledValue = numValue

        if (Math.abs(value) < 10)
            humanValue = value.toFixed(5)
        else if (Math.abs(value) < 1000)
            humanValue = value.toFixed(3)
        else if (Math.abs(value) < 100000)
            humanValue = value.toFixed(2)
        else
            humanValue = "" + value

        if (member.unit)
            humanValue += prettyUnit(member.unit)
    } else if (!isInt) {
        const buf = size ? pkt.data.slice(offset, offset + size) : pkt.data.slice(offset)
        if (member.type == "string") {
            try {
                value = fromUTF8(uint8ArrayToString(buf))
            } catch {
                // invalid UTF8
                value = uint8ArrayToString(buf)
            }
            humanValue = JSON.stringify(value).replace(/\\u0000/g, "\\0")
        } else if (member.type == "pipe") {
            value = buf
            const devid = toHex(buf.slice(0, 8))
            const port = read16(buf, 8)
            humanValue = "pipe to " + shortDeviceId(devid) + " port:" + port
            // + " [" + toHex(buf.slice(10)) + "]"
            if (pkt?.device?.bus) {
                const trg = pkt.device.bus.device(devid)
                trg.port(port).pipeType = service.shortId + "." + pktInfo.pipeType + ".report"
            }
        } else {
            value = buf
            humanValue = hexDump(buf)
        }
        size = buf.length
    } else {
        const fmt = numberFormatFromStorageType(member.storage)
        numValue = pkt.getNumber(fmt, offset)
        value = scaledValue = scaleIntToFloat(numValue, member)
        if (pkt.device && member.type == "pipe_port")
            pkt.device.port(value).pipeType = service.shortId + "." + pktInfo.pipeType + ".command"
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
        } else if (member.unit || scaledValue != numValue) {
            // don't show so much digits
            let v = scaledValue;
            if (member.unit)
                v = roundWithPrecision(v, 3)
            humanValue = v + prettyUnit(member.unit)
        }
        else {
            humanValue = scaledValue + ""
            if ((scaledValue | 0) == scaledValue && scaledValue >= 15)
                humanValue += " (" + hexNum(scaledValue) + ")"
            else if (scaledValue && member.storage == 8) {
                const did = toHex(pkt.data.slice(offset, offset + 8))
                humanValue += ` (${did} / ${shortDeviceId(did)})`
            }
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

export function valueToFlags(enumInfo: jdspec.EnumInfo, value: number) {
    let r = [];
    let curr = value
    for (const key of Object.keys(enumInfo.members)) {
        const val = enumInfo.members[key]
        if (curr & val) {
            r.push(val)
        }
    }
    return r;
}

export function flagsToValue(values: number[]) {
    return values.reduce((prev, cur) => prev | cur, 0)
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
    const isSet = !!(pkt.service_command & CMD_SET_REG)
    const isGet = !!(pkt.service_command & CMD_GET_REG)

    if (isSet == isGet)
        return null

    const addr = pkt.service_command & CMD_REG_MASK
    const regInfo =
        service.packets.find(p => isRegister(p) && p.identifier == addr)
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
        service,
        info: regInfo,
        decoded,
        description,
    }
}

function decodeEvent(service: jdspec.ServiceSpec, pkt: Packet): DecodedPacket {
    if (pkt.is_command || pkt.service_command != CMD_EVENT)
        return null

    const addr = pkt.getNumber(NumberFormat.UInt32LE, 0)
    const evInfo = service.packets.find(p => p.kind == "event" && p.identifier == addr)
        || syntheticPktInfo("event", addr)

    const decoded = decodeMembers(service, evInfo, pkt, 4)
    let description = "EVENT " + evInfo.name + wrapDecodedMembers(decoded)

    return {
        service,
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
        service,
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
    const pinfo = pkt.device.port(cmd >> PIPE_PORT_SHIFT)
    if (!pinfo.pipeType)
        return null

    const [servId, pipeType, dir] = pinfo.pipeType.split(/\./)
    const service = serviceSpecificationFromName(servId)
    if (!service)
        return null

    const meta = !!(cmd & PIPE_METADATA_MASK)
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
            service,
            info: cmdInfo,
            decoded,
            description,
        }
    }

    return null
}

export function decodePacketData(pkt: Packet): DecodedPacket {
    if (pkt.device && pkt.service_index == JD_SERVICE_INDEX_PIPE) {
        const info = decodePipe(pkt)
        if (info)
            return info
    }

    const srv_class = pkt?.multicommand_class || pkt?.device?.serviceClassAt(pkt.service_index);
    const service = serviceSpecificationFromClassIdentifier(srv_class)
    if (!service)
        return null

    return decodePacket(service, pkt)
}

function reverseLookup(map: SMap<number>, n: number) {
    for (let k of Object.keys(map)) {
        if (map[k] == n)
            return k
    }
    return hexNum(n)
}

export function serviceClass(name: string): number {
    const serv = serviceSpecificationFromName(name);
    return serv ? serv.classIdentifier : -1;
}

export function serviceName(n: number): string {
    if (n == null)
        return "?"
    const serv = serviceSpecificationFromClassIdentifier(n);
    return serv ? serv.name.toUpperCase() : "???"
}

export function serviceShortIdOrClass(serviceClass: number) {
    if (serviceClass == null)
        return "?"
    const serv = serviceSpecificationFromClassIdentifier(serviceClass);
    return serv?.shortId || `0x${serviceClass.toString(16)}`
}

export function deviceServiceName(pkt: Packet): string {
    const srv_class = pkt?.device?.serviceClassAt(pkt.service_index);
    const serv_id = serviceName(srv_class);
    return `${pkt?.device?.shortId || "?"}/${serv_id}:${pkt.service_index}`
}

export function commandName(n: number, serviceClass?: number): string {
    let pref = ""
    if ((n & CMD_TOP_MASK) == CMD_SET_REG) pref = "SET["
    else if ((n & CMD_TOP_MASK) == CMD_GET_REG) pref = "GET["
    if (pref) {
        const reg = n & CMD_REG_MASK
        let regName = SystemReg[reg]?.toLowerCase() // try reserved registers first, fast path
        if (regName === undefined) {
            const serviceSpec = serviceSpecificationFromClassIdentifier(serviceClass)
            regName = serviceSpec?.packets.find(pkt => pkt.identifier === reg)?.name
        }
        return pref + (regName !== undefined ? regName : `x${reg.toString(16)}` ) + "]"
    }

    let r = SystemCmd[n]?.toLowerCase()
    if (r === undefined) {
        const serviceSpec = serviceSpecificationFromClassIdentifier(serviceClass)
        r = serviceSpec?.packets.find(pkt => pkt.identifier === n)?.name
    }
    return r;
}

function num2str(n: number) {
    return n + " (0x" + n.toString(16) + ")"
}

export interface PrintPacketOptions {
    showTime?: boolean;
    skipRepeatedAnnounce?: boolean;
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
        return toHex(d) + "\u00A0|\u00A0" + toAscii(d)

    const a = toArray(d)
    let r = ""
    for (let i = 0; i < d.length; i += chunk) {
        if (i + chunk >= d.length) {
            let s = toHex(a.slice(i))
            while (s.length < chunk * 2)
                s += "  "
            r += s + "\u00A0|\u00A0" + toAscii(a.slice(i))
        } else {
            r += hexDump(a.slice(i, i + chunk)) + "\n"
        }
    }
    return r
}

export function printPacket(pkt: Packet, opts: PrintPacketOptions = {}): string {
    const frame_flags = pkt.frame_flags
    const devname = pkt.friendlyDeviceName
    const service_name = pkt.friendlyServiceName
    const cmdname = pkt.friendlyCommandName

    let pdesc = `${devname}/${service_name}: ${cmdname}; sz=${pkt.size}`

    if (frame_flags & JD_FRAME_FLAG_COMMAND)
        pdesc = 'to ' + pdesc
    else
        pdesc = 'from ' + pdesc
    if (frame_flags & JD_FRAME_FLAG_ACK_REQUESTED)
        pdesc = `[ack:${hexNum(pkt.crc)}] ` + pdesc

    const d = pkt.data
    if (pkt.device && pkt.service_index == JD_SERVICE_INDEX_CTRL && pkt.service_command == CMD_ADVERTISEMENT_DATA) {
        if (pkt.device.lastServiceUpdate < pkt.timestamp) {
            if (opts.skipRepeatedAnnounce)
                return ""
            else
                pdesc = " ====== " + pdesc
        } else {
            const services = []
            for (const sc of pkt.device.serviceClasses)
                services.push(serviceName(sc))
            pdesc += "; " + "Announce services: " + services.join(", ")
        }
    } else {
        const decoded = pkt.decoded
        if (decoded) {
            pdesc += "; " + decoded.description
        } else if (pkt.service_command == CMD_EVENT) {
            pdesc += "; ev=" + num2str(pkt.intData) + " arg=" + (read32(pkt.data, 4) | 0)
        } else if (0 < d.length && d.length <= 4) {
            let v0 = pkt.uintData, v1 = pkt.intData
            pdesc += "; " + num2str(v0)
            if (v0 != v1)
                pdesc += "; signed: " + num2str(v1)
        } else if (d.length) {
            pdesc += "; " + hexDump(d)
        }
    }

    return (!isNaN(pkt.timestamp) && opts?.showTime ? Math.round(pkt.timestamp) + "ms: " : "") + pdesc
}

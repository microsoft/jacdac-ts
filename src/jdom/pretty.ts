import { Packet } from "./packet"
import { NumberFormat } from "./buffer"
import {
    roundWithPrecision,
    idiv,
    fromHex,
    hash,
    fromUTF8,
    uint8ArrayToString,
    read16,
    toHex,
    toArray,
    hexNum,
    isSet,
} from "./utils"
import {
    isIntegerType,
    numberFormatFromStorageType,
    scaleIntToFloat,
    isRegister,
    serviceSpecificationFromName,
    serviceSpecificationFromClassIdentifier,
} from "./spec"
import {
    CMD_SET_REG,
    CMD_GET_REG,
    CMD_REG_MASK,
    PIPE_METADATA_MASK,
    CMD_TOP_MASK,
    PIPE_PORT_SHIFT,
    JD_FRAME_FLAG_COMMAND,
    JD_FRAME_FLAG_ACK_REQUESTED,
    CMD_ADVERTISEMENT_DATA,
    JD_SERVICE_INDEX_CTRL,
} from "./constants"
import {
    ControlReg,
    DeviceScriptManagerReg,
    GPIOReg,
    SRV_DEVICE_SCRIPT_MANAGER,
    SRV_GPIO,
    SRV_WIFI,
    SystemCmd,
    SystemReg,
    WifiReg,
} from "../../jacdac-spec/dist/specconstants"
import { jdpack, jdunpack } from "./pack"

/** @internal */
export enum RegisterType {
    UInt, // default
    UIntHex,
    Int,
    IntArray,
    String,
}

/**
 * @internal
 */
export interface DecodedMember {
    info: jdspec.PacketMember
    value: any
    numValue: number
    scaledValue: number
    humanValue: string
    description: string
    size: number
}

/**
 * @internal
 */
export interface DecodedPacket {
    service: jdspec.ServiceSpec
    info: jdspec.PacketInfo
    decoded: DecodedMember[]
    description: string
    error?: string
}

export function prettyUnit(u: jdspec.Unit | string): string {
    switch (u) {
        case "us":
            return "μs"
        case "C":
        case "Cel":
            return "°C"
        case "K":
            return "°K"
        case "/":
        case "#":
            return ""
        default:
            return u
    }
}

export function prettyMemberUnit(
    specification: jdspec.PacketMember,
    showDataType?: boolean,
) {
    const parts: string[] = [
        prettyUnit(specification.unit),
        isSet(specification.typicalMin) &&
            `[${specification.typicalMin}, ${specification.typicalMax}]`,
        isSet(specification.absoluteMin) &&
            `absolute [${specification.absoluteMin}, ${specification.absoluteMax}]`,
    ].filter(f => isSet(f) && f)
    if (showDataType) parts.unshift(specification.type)
    const helperText = parts.join(", ")
    return helperText
}

export function prettySize(b: number) {
    b = b | 0
    if (b === 0) return "0kb"
    else if (b < 100) return b + "b"
    else if (b < 1000) return roundWithPrecision(b / 1e3, 2) + "kb"
    else if (b < 1000000) return roundWithPrecision(b / 1e3, 1) + "kb"
    else return roundWithPrecision(b / 1e6, 1) + "mb"
}

export function prettyDuration(ms: number) {
    let s = ms / 1000
    if (s < 1) return `${roundWithPrecision(s, 2)}s`
    if (s < 10) return `${roundWithPrecision(s, 1)}s`
    if (s < 60) return `${Math.floor(s)}s`

    let r = ""
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
    return r
}

export function prettyMicroDuration(us: number) {
    if (us < 1000) return `${us}${prettyUnit("us")}`
    else return prettyDuration(us / 1000)
}

// 2 letter + 2 digit ID; 1.8%/0.3%/0.07%/0.015% collision probability among 50/20/10/5 devices
export function shortDeviceId(devid: string) {
    const h = hash(fromHex(devid), 30)
    return (
        String.fromCharCode(0x41 + (h % 26)) +
        String.fromCharCode(0x41 + (idiv(h, 26) % 26)) +
        String.fromCharCode(0x30 + (idiv(h, 26 * 26) % 10)) +
        String.fromCharCode(0x30 + (idiv(h, 26 * 26 * 10) % 10))
    )
}

export function isDeviceId(devid: string) {
    return devid && /^[a-f0-9]{16,16}$/i.test(devid)
}

function toIP(buffer: Uint8Array): string {
    if (!buffer) return undefined
    if (buffer.length === 4)
        return `${buffer[0]}.${buffer[1]}.${buffer[2]}.${buffer[3]}`
    else return toHex(buffer, ".")
}

function toMAC(buffer: Uint8Array) {
    const hex = toHex(buffer, ":")
    return hex
}

function toBits(buffer: Uint8Array) {
    let bitString = ""
    buffer.forEach(byte => {
        for (let i = 7; i >= 0; i--) {
            bitString += (byte >> i) & 1
        }
    })
    return bitString
}

export function prettyEnum(
    enumInfo: jdspec.EnumInfo,
    numValue: number,
    separator = " | ",
) {
    if (!enumInfo) return undefined

    let humanValue = ""
    if (enumInfo.isFlags) {
        humanValue = ""
        let curr = numValue
        for (const key of Object.keys(enumInfo.members)) {
            const val = enumInfo.members[key]
            if ((curr & val) == val) {
                if (humanValue) humanValue += separator
                humanValue += key
                curr &= ~val
            }
        }
        if (curr) {
            if (humanValue) humanValue += separator
            humanValue += hexNum(curr)
        }
    } else {
        humanValue = reverseLookup(enumInfo.members, numValue)
    }
    return humanValue
}

export function decodeMember(
    service: jdspec.ServiceSpec,
    pktInfo: jdspec.PacketInfo,
    member: jdspec.PacketMember,
    pkt: Packet,
    offset: number,
): DecodedMember {
    if (!member) return null

    if (pkt.data.length <= offset) return null

    let numValue: number = undefined
    let scaledValue: number = undefined
    let value = undefined
    let humanValue: string = undefined
    let size = Math.abs(member.storage)

    const enumInfo = service?.enums[member.type]
    const isInt = isIntegerType(member.type) || !!enumInfo

    if (
        service?.classIdentifier === SRV_WIFI &&
        pktInfo.kind === "ro" &&
        pktInfo.identifier === WifiReg.IpAddress &&
        offset == 0
    ) {
        value = pkt.data
        humanValue = toIP(pkt.data)
    } else if (
        service?.classIdentifier === SRV_GPIO &&
        pktInfo.kind === "ro" &&
        pktInfo.identifier === GPIOReg.State &&
        offset == 0
    ) {
        value = pkt.data
        humanValue = toBits(pkt.data)
    } else if (
        service?.classIdentifier === SRV_DEVICE_SCRIPT_MANAGER &&
        pktInfo.kind === "const" &&
        pktInfo.identifier === DeviceScriptManagerReg.RuntimeVersion &&
        offset == 0
    ) {
        value = pkt.data
        humanValue =
            value?.length >= 2 ? `${value[2]}.${value[1]}.${value[0]}` : "?"
    } else if (
        service?.classIdentifier === SRV_WIFI &&
        pktInfo.kind === "const" &&
        pktInfo.identifier === WifiReg.Eui48 &&
        offset == 0
    ) {
        value = pkt.data
        humanValue = toMAC(pkt.data)
    } else if (member.isFloat && (size == 4 || size == 8)) {
        if (size == 4) numValue = pkt.getNumber(NumberFormat.Float32LE, offset)
        else numValue = pkt.getNumber(NumberFormat.Float64LE, offset)
        value = scaledValue = numValue

        if (Math.abs(value) < 10) humanValue = value.toFixed(5)
        else if (Math.abs(value) < 1000) humanValue = value.toFixed(3)
        else if (Math.abs(value) < 100000) humanValue = value.toFixed(2)
        else humanValue = "" + value
        if (member.unit) humanValue += prettyUnit(member.unit)
    } else if (!isInt) {
        if (member.type == "string0") {
            let ptr = offset
            while (ptr < pkt.data.length) {
                if (!pkt.data[ptr++]) break
            }
            size = ptr - offset
        }
        const buf = size
            ? pkt.data.slice(offset, offset + size)
            : pkt.data.slice(offset)
        if (member.type == "string" || member.type == "string0") {
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
                const trg = pkt.device.bus.device(devid, true)
                if (trg)
                    trg.port(port).pipeType =
                        service?.shortId + "." + pktInfo.pipeType + ".report"
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
            pkt.device.port(value).pipeType =
                service?.shortId + "." + pktInfo.pipeType + ".command"
        if (enumInfo) {
            if (enumInfo.isFlags) {
                humanValue = ""
                let curr = numValue
                for (const key of Object.keys(enumInfo.members)) {
                    const val = enumInfo.members[key]
                    if ((curr & val) == val) {
                        if (humanValue) humanValue += " | "
                        humanValue += key
                        curr &= ~val
                    }
                }
                if (curr) {
                    if (humanValue) humanValue += " | "
                    humanValue += hexNum(curr)
                }
            } else {
                humanValue = reverseLookup(enumInfo.members, numValue)
            }
        } else if (member.type == "bool") {
            value = !!numValue
            humanValue = value ? "true" : "false"
        } else if (member.unit === "ms") humanValue = prettyDuration(value)
        else if (member.unit === "us") humanValue = prettyMicroDuration(value)
        else if (member.unit || scaledValue != numValue) {
            // don't show so much digits
            let v = scaledValue
            if (member.unit) v = roundWithPrecision(v, 3)
            humanValue = "" + v
            if (member.unit) humanValue += prettyUnit(member.unit)
        } else {
            humanValue = scaledValue + ""
            if (
                (scaledValue | 0) == scaledValue &&
                (!member.unit || scaledValue >= 15)
            ) {
                if (!member.unit) humanValue = hexNum(scaledValue)
                else humanValue += " (" + hexNum(scaledValue) + ")"
            } else if (scaledValue && member.storage == 8) {
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
        description:
            member.name +
            ":" +
            (!humanValue
                ? "?"
                : humanValue.indexOf("\n") >= 0
                ? "\n" + humanValue.replace(/^/gm, "      ")
                : " " + humanValue),
        info: member,
        size,
    }
}

export function valueToFlags(
    enumInfo: jdspec.EnumInfo,
    value: number,
): number[] {
    const r: number[] = []
    const curr = value
    for (const key of Object.keys(enumInfo.members)) {
        const val = enumInfo.members[key]
        if (curr & val) {
            r.push(val)
        }
    }
    return r
}

export function flagsToValue(values: number[]) {
    return values.reduce((prev, cur) => prev | cur, 0)
}

export function decodeMembers(
    service: jdspec.ServiceSpec,
    pktInfo: jdspec.PacketInfo,
    pkt: Packet,
    off = 0,
) {
    const fields = pktInfo.fields.slice(0)
    let startRep = fields.findIndex(f => f.startRepeats)
    let fidx = 0
    const res: DecodedMember[] = []

    while (off < pkt.data.length) {
        if (fidx >= fields.length && startRep >= 0) fidx = startRep
        const member = fields[fidx++]
        if (!member) {
            // warning: too large packet
            break
        }
        const decoded = decodeMember(service, pktInfo, member, pkt, off)
        if (decoded) {
            off += decoded.size
            res.push(decoded)
        } else {
            break // ???
        }
    }

    return res
}

export function wrapDecodedMembers(decoded: DecodedMember[]) {
    if (decoded.length == 0) return " {}"
    else if (decoded.length == 1 && decoded[0].description.length < 60)
        return " { " + decoded[0].description + " }"
    else
        return (
            " {\n" + decoded.map(d => "    " + d.description).join("\n") + "\n}"
        )
}

function syntheticPktInfo(
    kind: jdspec.PacketKind,
    addr: number,
): jdspec.PacketInfo {
    return {
        kind,
        identifier: addr,
        name: hexNum(addr),
        description: "",
        fields: [
            {
                name: "_",
                type: "bytes",
                storage: 0,
            },
        ],
    }
}

function decodeRegister(
    service: jdspec.ServiceSpec,
    pkt: Packet,
): DecodedPacket {
    const isSet = pkt.isRegisterSet
    const isGet = pkt.isRegisterGet

    if (!isSet && !isGet) return null

    let error = ""
    const addr = pkt.serviceCommand & CMD_REG_MASK
    let regInfo = service?.packets.find(
        p => isRegister(p) && p.identifier == addr,
    )
    if (!regInfo) {
        regInfo = syntheticPktInfo("rw", addr)
        error = `unable to decode register`
    }

    const decoded = decodeMembers(service, regInfo, pkt)

    if (regInfo.packFormat && pkt.data.length) {
        try {
            const recoded: string = toHex(
                jdpack(
                    regInfo.packFormat,
                    jdunpack(pkt.data, regInfo.packFormat),
                ),
            )
            if (recoded !== undefined && recoded !== toHex(pkt.data)) {
                error = `invalid data packing, ${toHex(
                    pkt.data,
                )} recoded to ${recoded}`
            }
        } catch (e) {
            error = `invalid data packing, ${e.message}`
        }
    }

    let description = ""
    if (decoded.length == 0) description = regInfo.name
    else if (decoded.length == 1)
        description = regInfo.name + ": " + decoded[0].humanValue
    else description = wrapDecodedMembers(decoded)

    if (isGet) description = "GET " + description
    else description = "SET " + description

    return {
        service,
        info: regInfo,
        decoded,
        description,
        error,
    }
}

function decodeEvent(service: jdspec.ServiceSpec, pkt: Packet): DecodedPacket {
    if (pkt.isCommand || !pkt.isEvent) return null

    const evCode = pkt.eventCode
    const evInfo =
        service?.packets.find(
            p => p.kind == "event" && p.identifier == evCode,
        ) || syntheticPktInfo("event", evCode)

    const decoded = decodeMembers(service, evInfo, pkt)
    const description =
        `EVENT[${pkt.eventCounter}] ${evInfo.name}` +
        wrapDecodedMembers(decoded)

    return {
        service,
        info: evInfo,
        decoded,
        description,
    }
}

function decodeCommand(
    service: jdspec.ServiceSpec,
    pkt: Packet,
): DecodedPacket {
    const kind = pkt.isCommand ? "command" : "report"
    const cmdInfo =
        service?.packets.find(
            p => p.kind == kind && p.identifier == pkt.serviceCommand,
        ) || syntheticPktInfo(kind, pkt.serviceCommand)

    const decoded = decodeMembers(service, cmdInfo, pkt)
    const description =
        (pkt.isCommand ? "CMD " : "REPORT ") +
        cmdInfo.name +
        wrapDecodedMembers(decoded)

    return {
        service,
        info: cmdInfo,
        decoded,
        description,
    }
}

function decodeCRCack(service: jdspec.ServiceSpec, pkt: Packet): DecodedPacket {
    if (!pkt.isReport || !pkt.isCRCAck) return null
    return {
        service,
        info: syntheticPktInfo("report", pkt.serviceCommand),
        decoded: [],
        description: "CRC-ACK " + hexNum(pkt.serviceCommand),
    }
}

function decodePacket(service: jdspec.ServiceSpec, pkt: Packet): DecodedPacket {
    const decoded =
        decodeCRCack(service, pkt) ||
        decodeRegister(service, pkt) ||
        decodeEvent(service, pkt) ||
        decodeCommand(service, pkt)
    return decoded
}

function decodePipe(pkt: Packet): DecodedPacket {
    const cmd = pkt.serviceCommand
    const pinfo = pkt.device.port(cmd >> PIPE_PORT_SHIFT)
    if (!pinfo.pipeType) return null

    const [servId, pipeType, dir] = pinfo.pipeType.split(/\./)
    const service = serviceSpecificationFromName(servId)
    if (!service) return null

    const meta = !!(cmd & PIPE_METADATA_MASK)
    const candidates = service.packets
        .filter(
            p =>
                p.pipeType == pipeType &&
                /pipe/.test(p.kind) &&
                /meta/.test(p.kind) == meta &&
                /command/.test(p.kind) == (dir == "command"),
        )
        .filter(
            p =>
                !meta ||
                pkt.getNumber(NumberFormat.UInt16LE, 0) == p.identifier,
        )

    const cmdInfo = candidates[0]
    if (cmdInfo) {
        const decoded = decodeMembers(service, cmdInfo, pkt, meta ? 4 : 0)
        const description =
            cmdInfo.kind.toUpperCase() +
            " " +
            cmdInfo.name +
            wrapDecodedMembers(decoded)
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
    try {
        if (pkt.device && pkt.isPipe) {
            const info = decodePipe(pkt)
            if (info) return info
        }

        const serviceClass = pkt.serviceClass
        const service = serviceSpecificationFromClassIdentifier(serviceClass)
        return decodePacket(service, pkt)
    } catch (error) {
        console.error(error, {
            error,
            pkt,
            data: toHex(pkt.data),
        })
        throw error
    }
}

function reverseLookup(map: Record<string, number>, n: number) {
    for (const k of Object.keys(map)) {
        if (map[k] == n) return k
    }
    return hexNum(n)
}

export function serviceClass(name: string): number {
    const serv = serviceSpecificationFromName(name)
    return serv ? serv.classIdentifier : -1
}

export function serviceName(serviceClass: number): string {
    if (!isSet(serviceClass)) return "?"
    const serv = serviceSpecificationFromClassIdentifier(serviceClass)
    return serv ? serv.name.toUpperCase() : "?"
}

export function serviceShortIdOrClass(serviceClass: number, hexPrefix = "0x") {
    if (!isSet(serviceClass)) return "?"
    const serv = serviceSpecificationFromClassIdentifier(serviceClass)
    return serv?.shortId || `${hexPrefix}${serviceClass.toString(16)}`
}

export function deviceServiceName(pkt: Packet): string {
    const srv_class = pkt?.device?.serviceClassAt(pkt.serviceIndex)
    const serv_id = serviceName(srv_class)
    return `${pkt?.device?.shortId || "?"}/${serv_id}:${pkt.serviceIndex}`
}

export function commandName(n: number, serviceClass?: number): string {
    let pref = ""
    if ((n & CMD_TOP_MASK) == CMD_SET_REG) pref = "SET["
    else if ((n & CMD_TOP_MASK) == CMD_GET_REG) pref = "GET["
    if (pref) {
        const reg = n & CMD_REG_MASK
        let regName = SystemReg[reg]?.toLowerCase() // try reserved registers first, fast path
        if (regName === undefined) {
            const serviceSpec =
                serviceSpecificationFromClassIdentifier(serviceClass)
            regName = serviceSpec?.packets.find(
                pkt => isRegister(pkt) && pkt.identifier === reg,
            )?.name
        }
        return (
            pref +
            (regName !== undefined ? regName : `x${reg.toString(16)}`) +
            "]"
        )
    }

    let r = SystemCmd[n]?.toLowerCase()
    if (r === undefined) {
        const serviceSpec =
            serviceSpecificationFromClassIdentifier(serviceClass)
        r = serviceSpec?.packets.find(
            pkt =>
                (pkt.kind === "command" || pkt.kind === "report") &&
                pkt.identifier === n,
        )?.name
    }
    return r
}

function num2str(n: number) {
    return n + " (0x" + n.toString(16) + ")"
}

export interface PrintPacketOptions {
    showTime?: boolean
    skipRepeatedAnnounce?: boolean
    skipResetIn?: boolean
}

export function toAscii(d: ArrayLike<number>) {
    let r = ""
    for (let i = 0; i < d.length; ++i) {
        const c = d[i]
        if (c < 32 || c >= 127) r += "."
        else r += String.fromCharCode(c)
    }
    return r
}

export function hexDump(d: ArrayLike<number>): string {
    const chunk = 32
    if (d.length <= chunk) return toHex(d) + "\u00A0|\u00A0" + toAscii(d)

    const a = toArray(d)
    let r = ""
    for (let i = 0; i < d.length; i += chunk) {
        if (i + chunk >= d.length) {
            let s = toHex(a.slice(i))
            while (s.length < chunk * 2) s += "  "
            r += s + "\u00A0|\u00A0" + toAscii(a.slice(i))
        } else {
            r += hexDump(a.slice(i, i + chunk)) + "\n"
        }
    }
    return r
}

export function printPacket(
    pkt: Packet,
    opts: PrintPacketOptions = {},
): string {
    const frame_flags = pkt.frameFlags
    const devname = pkt.friendlyDeviceName
    const service_name = pkt.friendlyServiceName
    const cmdname = pkt.friendlyCommandName || hexNum(pkt.serviceCommand)
    const sender = pkt.sender

    if (
        opts.skipResetIn &&
        pkt.serviceIndex === JD_SERVICE_INDEX_CTRL &&
        pkt.serviceCommand === (CMD_SET_REG | ControlReg.ResetIn)
    )
        return ""

    let pdesc = `${devname}/${service_name}: ${cmdname}; sz=${pkt.size}`

    if (frame_flags & JD_FRAME_FLAG_COMMAND) pdesc = "to " + pdesc
    else pdesc = "from " + pdesc
    if (frame_flags & JD_FRAME_FLAG_ACK_REQUESTED)
        pdesc = `[ack:${hexNum(pkt.crc)}] ` + pdesc

    const d = pkt.data
    if (
        pkt.device &&
        pkt.serviceIndex == JD_SERVICE_INDEX_CTRL &&
        pkt.serviceCommand == CMD_ADVERTISEMENT_DATA
    ) {
        if (pkt.device.lastServiceUpdate < pkt.timestamp) {
            if (opts.skipRepeatedAnnounce) return ""
            else pdesc = " ====== " + pdesc
        } else {
            pdesc +=
                "; Announce services: " +
                pkt.device.serviceClasses.map(serviceName).join(", ")
        }
    } else if (pkt.isRepeatedEvent) {
        pdesc = ` ------ ${pdesc} EVENT[${pkt.eventCounter}]`
    } else {
        const decoded = pkt.decoded
        if (decoded) {
            pdesc += "; " + decoded.description
        } else if (0 < d.length && d.length <= 4) {
            const v0 = pkt.uintData,
                v1 = pkt.intData
            pdesc += "; " + num2str(v0)
            if (v0 != v1) pdesc += "; signed: " + num2str(v1)
        } else if (d.length) {
            pdesc += "; " + hexDump(d)
        }
    }

    if (sender) pdesc += ` (${sender})`

    return (
        (!isNaN(pkt.timestamp) && opts?.showTime
            ? Math.round(pkt.timestamp) + "ms: "
            : "") + pdesc
    )
}

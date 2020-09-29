/// <reference path="../../jacdac-spec/spectool/jdspec.d.ts" />

import { NumberFormat, setNumber, sizeOfNumberFormat } from "./buffer";
import serviceSpecificationData from "../../jacdac-spec/dist/services.json";
import deviceRegistryData from "../../jacdac-spec/dist/devices.json";
import { fromHex, SMap, stringToUint8Array, toUTF8 } from "./utils";
import { BaseReg, CMD_SET_REG, JD_SERIAL_MAX_PAYLOAD_SIZE } from "./constants";
import Packet from "./packet";

const serviceSpecifications: jdspec.ServiceSpec[] = serviceSpecificationData as any;
let customServiceSpecifications: SMap<jdspec.ServiceSpec> = {};

const deviceRegistry: jdspec.DeviceSpec[] = deviceRegistryData as any;

/**
 * Adds a custom service specification
 * @param service 
 */
export function addCustomServiceSpecification(service: jdspec.ServiceSpec) {
    if (service && service.classIdentifier)
        customServiceSpecifications[service.classIdentifier] = service;
}

export function clearCustomServiceSpecifications() {
    customServiceSpecifications = {}
}

export function serviceMap(): SMap<jdspec.ServiceSpec> {
    const m: SMap<jdspec.ServiceSpec> = {};
    serviceSpecifications.forEach(spec => m[spec.shortId] = spec)
    return m;
}

export function deviceSpecificationFromClassIdenfitier(deviceClass: number): jdspec.DeviceSpec {
    if (deviceClass === undefined) return undefined;

    const spec = deviceRegistry.find(spec => spec.firmwares.indexOf(deviceClass) < -1);
    return spec;
}

export function deviceSpecificationFromIdentifier(id: string): jdspec.DeviceSpec {
    if (id === undefined) return undefined;

    const spec = deviceRegistry.find(spec => spec.id === id);
    return spec;
}

export function deviceSpecificationsForService(serviceClass: number): jdspec.DeviceSpec[] {
    if (serviceClass === undefined) return undefined;
    return deviceRegistry.filter(spec => spec.services.indexOf(serviceClass) > -1);
}

export function deviceSpecifications(): jdspec.DeviceSpec[] {
    return deviceRegistry.slice(0)
}

/**
 * Checks if classIdentifier is compatible with requiredClassIdentifier
*/
export function isInstanceOf(classIdentifier, requiredClassIdentifier: number): boolean {
    // garbage data
    if (classIdentifier === undefined)
        return false;

    // direct hit
    if (classIdentifier === requiredClassIdentifier)
        return true;

    // lookup inheritance chain
    const classSpec = serviceSpecificationFromClassIdentifier(classIdentifier);
    return !!classSpec?.extends?.some(extend => {
        const extendSpec = serviceSpecificationFromName(extend);
        return !!extendSpec && isInstanceOf(extendSpec.classIdentifier, requiredClassIdentifier)
    });
}

/**
 * Looks up a service specification by name
 * @param name 
 */
export function serviceSpecificationFromName(name: string): jdspec.ServiceSpec {
    const k = (name || "").toLowerCase().trim()
    return serviceSpecifications.find(s => s.shortId == name)
        || Object.values(customServiceSpecifications).find(ser => ser.shortId == name)
}

/**
 * Looks up a service specification by class
 * @param classIdentifier 
 */
export function serviceSpecificationFromClassIdentifier(classIdentifier: number): jdspec.ServiceSpec {
    if (classIdentifier === null || classIdentifier === undefined)
        return undefined;
    return serviceSpecifications.find(s => s.classIdentifier === classIdentifier)
        || customServiceSpecifications[classIdentifier]
}

export function isRegister(pkt: jdspec.PacketInfo) {
    return pkt.kind == "const" || pkt.kind == "ro" || pkt.kind == "rw"
}

export function isReading(pkt: jdspec.PacketInfo) {
    return pkt.kind == "ro" && pkt.identifier == BaseReg.Reading
}

export function isEvent(pkt: jdspec.PacketInfo) {
    return pkt.kind == "event"
}

export function isCommand(pkt: jdspec.PacketInfo) {
    return pkt.kind == "command"
}

export function isPipeReport(pkt: jdspec.PacketInfo) {
    return pkt.kind == "pipe_report"
}

export function isReportOf(cmd: jdspec.PacketInfo, report: jdspec.PacketInfo) {
    return report.secondary && report.kind == "report" && cmd.kind == "command" && cmd.name == report.name;
}

export function isPipeReportOf(cmd: jdspec.PacketInfo, pipeReport: jdspec.PacketInfo) {
    return pipeReport.kind == "pipe_report" && cmd.kind == "command" && cmd.pipeType && cmd.pipeType === pipeReport.pipeType;
}

export function isIntegerType(tp: string) {
    return /^[ui]\d+(\.|$)/.test(tp) || tp == "pipe_port" || tp == "bool"
}

export function numberFormatFromStorageType(tp: jdspec.StorageType) {
    switch (tp) {
        case -1: return NumberFormat.Int8LE
        case 1: return NumberFormat.UInt8LE
        case -2: return NumberFormat.Int16LE
        case 2: return NumberFormat.UInt16LE
        case -4: return NumberFormat.Int32LE
        case 4: return NumberFormat.UInt32LE
        case -8: return NumberFormat.Int64LE
        case 8: return NumberFormat.UInt64LE
        case 0: return null
        default: return null
    }
}

export function scaleIntToFloat(v: number, info: jdspec.PacketMember) {
    if (!info.shift) return v
    if (info.shift < 0)
        return v * (1 << -info.shift)
    else
        return v / (1 << info.shift)
}

export function scaleFloatToInt(v: number, info: jdspec.PacketMember) {
    if (!info.shift) return v
    if (info.shift < 0)
        return Math.round(v / (1 << -info.shift))
    else
        return Math.round(v * (1 << info.shift))
}

export function storageTypeRange(tp: jdspec.StorageType): [number, number] {
    if (tp == 0)
        throw new Error("no range for 0")
    if (tp < 0) {
        const v = Math.pow(2, -tp * 8 - 1)
        return [-v, v - 1]
    } else {
        const v = Math.pow(2, -tp * 8)
        return [0, v - 1]
    }
}

export function clampToStorage(v: number, tp: jdspec.StorageType) {
    const [min, max] = storageTypeRange(tp)
    if (isNaN(v))
        return 0
    if (v < min)
        return min
    if (v > max)
        return max
    return v
}

export function tryParseMemberValue(text: string, info: jdspec.PacketMember): { value?: any, error?: string } {
    if (!text)
        return {}

    if (info.type == "string")
        return { value: text }
    else if (info.type == "pipe")
        return {} // not supported
    else {
        const n = isIntegerType(info.type) ? parseInt(text) : parseFloat(text)
        if (isNaN(n))
            return { error: 'invalid format' }
        else
            return { value: n }
    }
}

export type ArgType = number | boolean | string | Uint8Array
export function packArguments(info: jdspec.PacketInfo, args: ArgType[]) {
    let repeatIdx = -1
    let numReps = 0
    let argIdx = 0
    let dst = 0

    const buf = new Uint8Array(256)

    for (let i = 0; i < info.fields.length; ++i) {
        if (argIdx >= args.length && numReps > 0)
            break
        const arg0 = argIdx < args.length ? args[argIdx] : 0
        const fld = info.fields[i]

        if (repeatIdx == -1 && fld.startRepeats)
            repeatIdx = i

        const arg = typeof arg0 == "boolean" ? (arg0 ? 1 : 0)
            : typeof arg0 == "string" ? stringToUint8Array(toUTF8(arg0)) : arg0

        if (typeof arg == "number") {
            const intVal = scaleFloatToInt(arg, fld)
            if (fld.storage == 0)
                throw new Error(`expecting ${fld.type} got number`)

            const fmt = numberFormatFromStorageType(fld.storage)
            setNumber(buf, fmt, dst, clampToStorage(intVal, fld.storage))
            dst += sizeOfNumberFormat(fmt)
        } else {
            if (fld.storage == 0 || Math.abs(fld.storage) == arg.length) {
                buf.set(arg, dst)
                dst += arg.length
            } else {
                throw new Error(`expecting ${Math.abs(fld.storage)} bytes; got ${arg.length}`)
            }
        }

        if (dst >= JD_SERIAL_MAX_PAYLOAD_SIZE)
            throw new Error("packet too big")

        if (repeatIdx != -1 && i + 1 >= info.fields.length) {
            i = repeatIdx - 1
            numReps++
        }
    }

    const cmd = isRegister(info) ? info.identifier | CMD_SET_REG : info.identifier
    const pkt = Packet.from(cmd, buf.slice(0, dst))
    if (info.kind != "report")
        pkt.is_command = true
    return pkt
}

export function parseDeviceId(id: string) {
    id = id.replace(/\s/g, "")
    if (id.length != 16 || !/^[a-f0-9]+$/i.test(id))
        return null
    return fromHex(id)
}

export function hasPipeReport(info: jdspec.PacketInfo) {
    return info.fields.find(f => f.type == "pipe")
}

/// <reference path="../../jacdac-spec/spectool/jdspec.d.ts" />

import { NumberFormat } from "./buffer";
import serviceSpecificationData from "../../jacdac-spec/dist/services.json";
import moduleRegistryData from "../../jacdac-spec/dist/modules.json";
import { fromHex, SMap } from "./utils";
import { BaseReg, SensorReg } from "./constants";

const _serviceSpecifications: jdspec.ServiceSpec[] = serviceSpecificationData as any;
let _customServiceSpecifications: SMap<jdspec.ServiceSpec> = {};
const _moduleRegistry: jdspec.DeviceSpec[] = moduleRegistryData as any;

/**
 * Adds a custom service specification
 * @param service 
 */
export function addCustomServiceSpecification(service: jdspec.ServiceSpec) {
    if (service && service.classIdentifier)
        _customServiceSpecifications[service.classIdentifier] = service;
}

export function clearCustomServiceSpecifications() {
    _customServiceSpecifications = {}
}

export function serviceMap(): SMap<jdspec.ServiceSpec> {
    const m: SMap<jdspec.ServiceSpec> = {};
    _serviceSpecifications.forEach(spec => m[spec.shortId] = spec)
    return m;
}

export function serviceSpecifications() {
    return _serviceSpecifications.slice(0);
}

export function deviceSpecificationFromFirmwareIdentifier(firmwareIdentifier: number): jdspec.DeviceSpec {
    if (firmwareIdentifier === undefined) return undefined;

    const spec = _moduleRegistry.find(spec => spec.firmwares.indexOf(firmwareIdentifier) > -1);
    return spec;
}

export function deviceSpecificationFromIdentifier(id: string): jdspec.DeviceSpec {
    if (id === undefined) return undefined;

    const spec = _moduleRegistry.find(spec => spec.id === id);
    return spec;
}

export function deviceSpecificationsForService(serviceClass: number): jdspec.DeviceSpec[] {
    if (serviceClass === undefined) return undefined;
    return _moduleRegistry.filter(spec => spec.services.indexOf(serviceClass) > -1);
}

export function deviceSpecifications(): jdspec.DeviceSpec[] {
    return _moduleRegistry.slice(0)
}

export function imageDeviceOf(spec: jdspec.DeviceSpec): string {
    return spec?.image && `https://raw.githubusercontent.com/microsoft/jacdac/main/devices/${spec.image}`
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
    return _serviceSpecifications.find(s => s.shortId == name)
        || Object.values(_customServiceSpecifications).find(ser => ser.shortId == name)
}

/**
 * Looks up a service specification by class
 * @param classIdentifier 
 */
export function serviceSpecificationFromClassIdentifier(classIdentifier: number): jdspec.ServiceSpec {
    if (classIdentifier === null || classIdentifier === undefined || isNaN(classIdentifier))
        return undefined;
    return _serviceSpecifications.find(s => s.classIdentifier === classIdentifier)
        || _customServiceSpecifications[classIdentifier]
}

export function isSensor(spec: jdspec.ServiceSpec): boolean {
    return spec
        && spec.packets.some(pkt => isReading(pkt))
        && spec.packets.some(pkt => pkt.identifier == SensorReg.StreamSamples)
        && spec.packets.some(pkt => pkt.identifier == SensorReg.StreamingInterval)
}

export function isRegister(pkt: jdspec.PacketInfo) {
    return pkt && (pkt.kind == "const" || pkt.kind == "ro" || pkt.kind == "rw")
}

export function isReading(pkt: jdspec.PacketInfo) {
    return pkt && (pkt.kind == "ro" && pkt.identifier == BaseReg.Reading)
}

export function isConstRegister(pkt: jdspec.PacketInfo) {
    return pkt?.kind == "const"
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

export function parseDeviceId(id: string) {
    id = id.replace(/\s/g, "")
    if (id.length != 16 || !/^[a-f0-9]+$/i.test(id))
        return null
    return fromHex(id)
}

export function hasPipeReport(info: jdspec.PacketInfo) {
    return info.fields.find(f => f.type == "pipe")
}
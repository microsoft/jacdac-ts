/// <reference path="../../jacdac-spec/spectool/jdspec.d.ts" />

import { NumberFormat } from "./buffer";
import serviceSpecificationData from "../../jacdac-spec/dist/services.json";
import deviceRegistryData from "../../jacdac-spec/dist/devices.json";
import { fromHex, SMap, toHex } from "./utils";
import { SystemReg, SensorReg, SRV_CONTROL, SRV_ROLE_MANAGER, SRV_SETTINGS, SRV_BOOTLOADER, SRV_LOGGER, SRV_POWER, SRV_PROTO_TEST } from "./constants";
import makecodeServicesData from "../../jacdac-spec/services/makecode.json";

const _serviceSpecifications: jdspec.ServiceSpec[] = serviceSpecificationData as any;
let _customServiceSpecifications: SMap<jdspec.ServiceSpec> = {};
const _deviceRegistry: jdspec.DeviceSpec[] = deviceRegistryData as any;

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

    const spec = _deviceRegistry.find(spec => spec.firmwares.indexOf(firmwareIdentifier) > -1);
    return spec;
}

export function deviceSpecificationFromIdentifier(id: string): jdspec.DeviceSpec {
    if (id === undefined) return undefined;

    const spec = _deviceRegistry.find(spec => spec.id === id);
    return spec;
}

export function deviceSpecificationsForService(serviceClass: number): jdspec.DeviceSpec[] {
    if (serviceClass === undefined) return undefined;
    return _deviceRegistry.filter(spec => spec.services.indexOf(serviceClass) > -1);
}

export function deviceSpecifications(): jdspec.DeviceSpec[] {
    return _deviceRegistry.slice(0)
}

export function imageDeviceOf(spec: jdspec.DeviceSpec): string {
    return spec && `https://raw.githubusercontent.com/microsoft/jacdac/main/devices/${identifierToUrlPath(spec.id)}.jpg`
}

export function identifierToUrlPath(id: string) {
    return id?.replace(/-/g, '/')
}

/**
 * Checks if classIdentifier is compatible with requiredClassIdentifier
*/
export function isInstanceOf(classIdentifier: number, requiredClassIdentifier: number): boolean {
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

export function isInfrastructure(spec: jdspec.ServiceSpec) {
    return spec &&
        ([
            SRV_CONTROL, SRV_ROLE_MANAGER, SRV_LOGGER,
            SRV_POWER, SRV_SETTINGS, SRV_BOOTLOADER,
            SRV_PROTO_TEST
        ].indexOf(spec.classIdentifier) > -1
            || spec.shortId[0] === "_");
}

export function makeCodeServices(): jdspec.MakeCodeServiceInfo[] {
    return (makecodeServicesData as jdspec.MakeCodeServiceInfo[]).slice(0);
}

export function resolveMakecodeService(service: jdspec.ServiceSpec) {
    return service && (makecodeServicesData as jdspec.MakeCodeServiceInfo[])
        .find(mk => mk.service === service.shortId);
}

export function resolveMakecodeServiceFromClassIdentifier(serviceClass: number) {
    const srv = serviceSpecificationFromClassIdentifier(serviceClass);
    return srv && resolveMakecodeService(srv);
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
        && spec.packets.some(pkt => pkt.identifier == SensorReg.StreamingSamples)
        && spec.packets.some(pkt => pkt.identifier == SensorReg.StreamingInterval)
}

export function isActuator(spec: jdspec.ServiceSpec): boolean {
    return spec
        && spec.packets.some(pkt => pkt.identifier === SystemReg.Value)
        && spec.packets.some(pkt => pkt.identifier === SystemReg.Intensity);
}

export function isRegister(pkt: jdspec.PacketInfo) {
    return pkt && (pkt.kind == "const" || pkt.kind == "ro" || pkt.kind == "rw")
}

export function isReading(pkt: jdspec.PacketInfo) {
    return pkt && (pkt.kind == "ro" && pkt.identifier == SystemReg.Reading)
}

export function isIntensity(pkt: jdspec.PacketInfo) {
    return pkt && pkt.kind == "rw" && pkt.identifier == SystemReg.Intensity;
}

export function isValue(pkt: jdspec.PacketInfo) {
    return pkt && pkt.kind == "rw" && pkt.identifier == SystemReg.Value;
}

export function isValueOrIntensity(pkt: jdspec.PacketInfo) {
    return pkt && (pkt.kind == "rw" && (pkt.identifier == SystemReg.Value || pkt.identifier == SystemReg.Intensity))
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

export function numberFormatToStorageType(nf: NumberFormat) {
    switch (nf) {
        case NumberFormat.Int8LE: return -1;
        case NumberFormat.UInt8LE: return 1;
        case NumberFormat.Int16LE: return -2;
        case NumberFormat.UInt16LE: return 2;
        case NumberFormat.Int32LE: return -4;
        case NumberFormat.UInt32LE: return 4;
        case NumberFormat.Int64LE: return -8;
        case NumberFormat.UInt64LE: return 8;
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
        const v = Math.pow(2, tp * 8)
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

export function memberValueToString(value: any, info: jdspec.PacketMember): string {
    if (value === undefined || value === null)
        return "";
    switch (info.type) {
        case "bytes": return toHex(value);
        case "string": return value;
        default: return "" + value;
    }
}

export function tryParseMemberValue(text: string, info: jdspec.PacketMember): { value?: any, error?: string } {
    if (!text)
        return {}

    if (info.type === "string")
        return { value: text }
    else if (info.type === "pipe")
        return {} // not supported
    else if (info.type === "bytes") {
        try {
            return { value: fromHex(text) }
        }
        catch (e) {
            return {
                error: 'invalid hexadecimal format'
            }
        }
    }
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
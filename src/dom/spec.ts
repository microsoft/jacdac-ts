/// <reference path="../../jacdac-spec/spectool/jdspec.d.ts" />

import { NumberFormat } from "./buffer";
import specdata from "../../jacdac-spec/dist/spec.json";
import { SMap } from "./utils";
import { BaseReg } from "./constants";

const serviceSpecifications: jdspec.ServiceSpec[] = specdata as any;
let customServiceSpecifications: SMap<jdspec.ServiceSpec> = {};

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

export function scaleValue(v: number, info: jdspec.PacketMember) {
    return v / (1 << info.shift)
}

/// <reference path="spec.d.ts" />

import { NumberFormat } from "./buffer";
import * as specdata from "./specdata";

export const serviceSpecifications = specdata.serviceSpecifications

/**
 * Looks up a service specification by name
 * @param name 
 */
export function serviceSpecificationFromName(name: string): jdspec.ServiceSpec {
    const k = (name || "").toLowerCase().trim()
    return serviceSpecifications[name];
}

/**
 * Looks up a service specification by class
 * @param classIdentifier 
 */
export function serviceSpecificationFromClassIdentifier(classIdentifier: number): jdspec.ServiceSpec {
    if (classIdentifier === null || classIdentifier === undefined)
        return undefined;
    for (const name of Object.keys(serviceSpecifications)) {
        const spec = serviceSpecifications[name]
        if (spec.classIdentifier === classIdentifier)
            return spec;
    }
    return undefined;
}

export function isRegister(pkt: jdspec.PacketInfo) {
    return pkt.kind == "const" || pkt.kind == "ro" || pkt.kind == "rw"
}

export function isIntegerType(tp: string) {
    return /^[ui]\d+/.test(tp) || tp == "pipe_port"
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

export function scaleValue(v: number, tp: string) {
    const m = /^[ui](\d+)\.(\d+)$/.exec(tp)
    if (m)
        return v / (1 << parseInt(m[2]))
    return v
}

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../jacdac-spec/spectool/jdspec.d.ts" />

import { NumberFormat } from "./buffer"
import serviceSpecificationData from "../../jacdac-spec/dist/services.json"
import { bufferEq, fromHex, toggleBit, toHex } from "./utils"
import {
    SystemEvent,
    SystemReg,
    SensorReg,
    SRV_CONTROL,
    SRV_ROLE_MANAGER,
    SRV_SETTINGS,
    SRV_BOOTLOADER,
    SRV_LOGGER,
    SRV_INFRASTRUCTURE,
    SRV_PROTO_TEST,
    SRV_PROXY,
    SRV_UNIQUE_BRAIN,
    SRV_DASHBOARD,
    SRV_BRIDGE,
    SRV_DEVICE_SCRIPT_CONDITION,
    SRV_DEVICE_SCRIPT_MANAGER,
    SRV_DEVS_DBG,
} from "./constants"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _serviceSpecifications: jdspec.ServiceSpec[] =
    serviceSpecificationData as any
let _serviceSpecificationMap: Record<number, jdspec.ServiceSpec> = undefined

/**
 * Override built-in service specifications
 * @param specs * @category Specification
 */
export function loadServiceSpecifications(
    specifications: jdspec.ServiceSpec[],
): {
    added: jdspec.ServiceSpec[]
    errors: { message: string; spec: jdspec.ServiceSpec }[]
    changed: boolean
} {
    const previous = _serviceSpecifications

    // combine builtin specs with new specs
    const builtins = (serviceSpecificationData ||
        []) as any as jdspec.ServiceSpec[]
    const specs = builtins.slice(0)
    const added: jdspec.ServiceSpec[] = []
    const errors: { message: string; spec: jdspec.ServiceSpec }[] = []

    if (specifications?.length) {
        const serviceClasses = new Set<number>(
            specs.map(s => s.classIdentifier),
        )
        const shortIds = new Set<string>(specs.map(s => s.shortId))
        for (const spec of specifications) {
            if (serviceClasses.has(spec.classIdentifier)) {
                const existingSpec = specs.find(
                    s => s.classIdentifier === spec.classIdentifier,
                )
                if (JSON.stringify(existingSpec) === JSON.stringify(spec))
                    continue // inserting a duplicate, ignore
                errors.push({
                    message: "classIdentifier already in use",
                    spec,
                })
                continue
            }
            if (shortIds.has(spec.shortId)) {
                errors.push({
                    message: "shortId already in use",
                    spec,
                })
                continue
            }

            specs.push(spec)
            added.push(spec)
            serviceClasses.add(spec.classIdentifier)
            shortIds.add(spec.shortId)
        }
    }

    const changed = JSON.stringify(previous) !== JSON.stringify(specs)
    if (changed) {
        _serviceSpecifications = specs
        _serviceSpecificationMap = undefined
    }
    return { added, errors, changed }
}

/**
 * Returns a map from service short ids to service specifications
 * @category Specification
 */
export function serviceMap(): Record<string, jdspec.ServiceSpec> {
    const m: Record<string, jdspec.ServiceSpec> = {}
    _serviceSpecifications.forEach(spec => (m[spec.shortId] = spec))
    return m
}

/**
 * Returns the list of service specifications
 * @category Specification
 */
export function serviceSpecifications() {
    return _serviceSpecifications.slice(0)
}

/**
 * Checks if classIdentifier is compatible with requiredClassIdentifier
 * @category Specification
 */
export function isInstanceOf(
    classIdentifier: number,
    requiredClassIdentifier: number,
): boolean {
    // garbage data
    if (isNaN(classIdentifier)) return false

    // direct hit
    if (classIdentifier === requiredClassIdentifier) return true

    // lookup inheritance chain
    const classSpec = serviceSpecificationFromClassIdentifier(classIdentifier)
    return !!classSpec?.extends?.some(extend => {
        const extendSpec = serviceSpecificationFromName(extend)
        return (
            !!extendSpec &&
            isInstanceOf(extendSpec.classIdentifier, requiredClassIdentifier)
        )
    })
}

/**
 * Checks if the service supports the Jacdac infrastructure
 * @param spec
 * @returns
 * @category Specification
 */
export function isInfrastructure(spec: jdspec.ServiceSpec) {
    return (
        spec &&
        ([
            SRV_CONTROL,
            SRV_ROLE_MANAGER,
            SRV_LOGGER,
            SRV_SETTINGS,
            SRV_BOOTLOADER,
            SRV_PROTO_TEST,
            SRV_INFRASTRUCTURE,
            SRV_PROXY,
            SRV_UNIQUE_BRAIN,
            SRV_DASHBOARD,
            SRV_BRIDGE,
            SRV_DEVICE_SCRIPT_CONDITION,
            SRV_DEVICE_SCRIPT_MANAGER,
            SRV_DEVS_DBG,
        ].indexOf(spec.classIdentifier) > -1 ||
            spec.shortId[0] === "_")
    )
}

/**
 * Looks up a service specification by name
 * @param shortId
 * @category Specification
 */
export function serviceSpecificationFromName(
    shortId: string,
): jdspec.ServiceSpec {
    if (!shortId) return undefined
    return _serviceSpecifications.find(s => s.shortId === shortId)
}

/**
 * Looks up a service specification by class
 * @param classIdentifier
 * @category Specification
 */
export function serviceSpecificationFromClassIdentifier(
    classIdentifier: number,
): jdspec.ServiceSpec {
    if (isNaN(classIdentifier)) return undefined
    // try lookup cache
    let srv = _serviceSpecificationMap?.[classIdentifier]
    if (srv) return srv

    // resolve
    srv = _serviceSpecifications.find(
        s => s.classIdentifier === classIdentifier,
    )
    if (srv) {
        if (!_serviceSpecificationMap) _serviceSpecificationMap = {}
        _serviceSpecificationMap[classIdentifier] = srv
    }
    return srv
}

/**
 * Indicates if the specified service is a sensor
 * @param spec
 * @returns
 * @category Specification
 */
export function isSensor(spec: jdspec.ServiceSpec): boolean {
    return (
        spec &&
        spec.packets.some(pkt => isReading(pkt)) &&
        spec.packets.some(pkt => pkt.identifier == SensorReg.StreamingSamples)
    )
}

/**
 * Indicates if the specified service is an actuator
 * @param spec
 * @returns
 * @category Specification
 */
export function isActuator(spec: jdspec.ServiceSpec): boolean {
    return (
        spec &&
        spec.packets.some(pkt => pkt.identifier === SystemReg.Value) &&
        spec.packets.some(pkt => pkt.identifier === SystemReg.Intensity)
    )
}

/**
 * Indicates if the packet information is a register
 * @param spec
 * @returns
 * @category Specification
 */
export function isRegister(pkt: jdspec.PacketInfo) {
    return pkt && (pkt.kind == "const" || pkt.kind == "ro" || pkt.kind == "rw")
}

/**
 * Indicates if the packet information is a ``reading`` register
 * @param spec
 * @returns
 * @category Specification
 */
export function isReading(pkt: jdspec.PacketInfo) {
    return pkt && pkt.kind == "ro" && pkt.identifier == SystemReg.Reading
}

const ignoredRegister = [
    SystemReg.StatusCode,
    SystemReg.InstanceName,
    SystemReg.StreamingInterval,
    SystemReg.StreamingPreferredInterval,
    SystemReg.StreamingSamples,
    SystemReg.ReadingError,
    SystemReg.ReadingResolution,
    SystemReg.MinReading,
    SystemReg.MaxReading,
    SystemReg.MinValue,
    SystemReg.MaxValue,
    SystemReg.MaxPower,
]
/**
 * Indicates if the register is usable from a high-level programming environment.
 * @category Specification
 */
export function isHighLevelRegister(pkt: jdspec.PacketInfo) {
    return (
        isRegister(pkt) &&
        !pkt.lowLevel &&
        !pkt.internal &&
        ignoredRegister.indexOf(pkt.identifier) < 0
    )
}

const ignoredEvents = [SystemEvent.StatusCodeChanged]
/**
 * Indicates if the event is usable from a high-level programming environment.
 * @category Specification
 */
export function isHighLevelEvent(pkt: jdspec.PacketInfo) {
    return (
        isEvent(pkt) &&
        !pkt.lowLevel &&
        !pkt.internal &&
        ignoredEvents.indexOf(pkt.identifier) < 0
    )
}

/**
 * Indicate if the register code is an auxilliary register to support streaming.
 * @param code
 * @returns
 * @category Specification
 */
export function isOptionalReadingRegisterCode(code: number) {
    const regs = [
        SystemReg.MinReading,
        SystemReg.MaxReading,
        SystemReg.ReadingError,
        SystemReg.ReadingResolution,
        SystemReg.StreamingPreferredInterval,

        SystemReg.StreamingInterval,
        SystemReg.StreamingSamples,
    ]
    return regs.indexOf(code) > -1
}

/**
 * Indicates if the packet info represents an ``intensity`` register
 * @category Specification
 */
export function isIntensity(pkt: jdspec.PacketInfo) {
    return pkt && pkt.kind == "rw" && pkt.identifier == SystemReg.Intensity
}

/**
 * Indicates if the packet info represents a ``value`` register
 * @category Specification
 */
export function isValue(pkt: jdspec.PacketInfo) {
    return pkt && pkt.kind == "rw" && pkt.identifier == SystemReg.Value
}

/**
 * Indicates if the packet info represents a ``intensity`` or a ``value`` register
 * @category Specification
 */
export function isValueOrIntensity(pkt: jdspec.PacketInfo) {
    return (
        pkt &&
        pkt.kind == "rw" &&
        (pkt.identifier == SystemReg.Value ||
            pkt.identifier == SystemReg.Intensity)
    )
}

/**
 * Indicates if the packet info represents an ``const`` register
 * @category Specification
 */
export function isConstRegister(pkt: jdspec.PacketInfo) {
    return pkt?.kind === "const"
}

/**
 * Indicates if the packet info is not rw
 */
export function isReadOnlyRegister(pkt: jdspec.PacketInfo) {
    return pkt?.kind !== "rw"
}

/**
 * Indicates if the packet info represents an ``event``
 * @category Specification
 */
export function isEvent(pkt: jdspec.PacketInfo) {
    return pkt.kind == "event"
}

/**
 * Indicates if the packet info represents a ``command``
 * @category Specification
 */
export function isCommand(pkt: jdspec.PacketInfo) {
    return pkt.kind == "command"
}

/**
 * Indicates if the packet info represents a ``pipe_report``
 * @category Specification
 */
export function isPipeReport(pkt: jdspec.PacketInfo) {
    return pkt.kind == "pipe_report"
}

/**
 * Indicates if the `report` packet is the report specication of the `cmd` command.
 * @category Specification
 */
export function isReportOf(cmd: jdspec.PacketInfo, report: jdspec.PacketInfo) {
    return (
        report.secondary &&
        report.kind == "report" &&
        cmd.kind == "command" &&
        cmd.name == report.name
    )
}

/**
 * Indicates if the `report` packet is the *pipe* report specication of the `cmd` command.
 * @category Specification
 */
export function isPipeReportOf(
    cmd: jdspec.PacketInfo,
    pipeReport: jdspec.PacketInfo,
) {
    return (
        pipeReport.kind == "pipe_report" &&
        cmd.kind == "command" &&
        cmd.pipeType &&
        cmd.pipeType === pipeReport.pipeType
    )
}

/**
 * @internal
 */
export function isIntegerType(tp: string) {
    return /^[ui]\d+(\.|$)/.test(tp) || tp == "pipe_port" || tp == "bool"
}

/**
 * @internal
 */
export function numberFormatFromStorageType(tp: jdspec.StorageType) {
    switch (tp) {
        case -1:
            return NumberFormat.Int8LE
        case 1:
            return NumberFormat.UInt8LE
        case -2:
            return NumberFormat.Int16LE
        case 2:
            return NumberFormat.UInt16LE
        case -4:
            return NumberFormat.Int32LE
        case 4:
            return NumberFormat.UInt32LE
        case -8:
            return NumberFormat.Int64LE
        case 8:
            return NumberFormat.UInt64LE
        case 0:
            return null
        default:
            return null
    }
}

/**
 * @internal
 */
export function numberFormatToStorageType(nf: NumberFormat) {
    switch (nf) {
        case NumberFormat.Int8LE:
            return -1
        case NumberFormat.UInt8LE:
            return 1
        case NumberFormat.Int16LE:
            return -2
        case NumberFormat.UInt16LE:
            return 2
        case NumberFormat.Int32LE:
            return -4
        case NumberFormat.UInt32LE:
            return 4
        case NumberFormat.Int64LE:
            return -8
        case NumberFormat.UInt64LE:
            return 8
        default:
            return null
    }
}

/**
 * @internal
 */
export function scaleIntToFloat(v: number, info: jdspec.PacketMember) {
    if (!info.shift) return v
    if (info.shift < 0) return v * (1 << -info.shift)
    else return v / (1 << info.shift)
}

/**
 * @internal
 */
export function scaleFloatToInt(v: number, info: jdspec.PacketMember) {
    if (!info.shift) return v
    if (info.shift < 0) return Math.round(v / (1 << -info.shift))
    else return Math.round(v * (1 << info.shift))
}

/**
 * @internal
 */
export function storageTypeRange(tp: jdspec.StorageType): [number, number] {
    if (tp == 0) throw new Error("no range for 0")
    if (tp < 0) {
        const v = Math.pow(2, -tp * 8 - 1)
        return [-v, v - 1]
    } else {
        const v = Math.pow(2, tp * 8)
        return [0, v - 1]
    }
}

/**
 * @internal
 */
export function clampToStorage(v: number, tp: jdspec.StorageType) {
    if (tp == null) return v // no clamping for floats
    const [min, max] = storageTypeRange(tp)
    if (isNaN(v)) return 0
    if (v < min) return min
    if (v > max) return max
    return v
}

/**
 * @internal
 */
export function memberValueToString(
    value: any,
    info: jdspec.PacketMember,
): string {
    if (value === undefined || value === null) return ""
    switch (info.type) {
        case "bytes":
            return toHex(value)
        case "string":
            return value
        default:
            return "" + value
    }
}

/**
 * @internal
 */
export function tryParseMemberValue(
    text: string,
    info: jdspec.PacketMember,
): { value?: any; error?: string } {
    if (!text) return {}

    if (info.type === "string") return { value: text }
    else if (info.type === "pipe") return {}
    // not supported
    else if (info.type === "bytes") {
        try {
            return { value: fromHex(text) }
        } catch (e) {
            return {
                error: "invalid hexadecimal format",
            }
        }
    } else {
        const n = isIntegerType(info.type) ? parseInt(text) : parseFloat(text)
        if (isNaN(n)) return { error: "invalid format" }
        else return { value: n }
    }
}

/**
 * Parses a device identifier into a buffer, returns undefined if invalid
 * @param id
 * @returns
 * @category Specification
 */
export function parseDeviceId(id: string): Uint8Array {
    if (!id) return undefined
    id = id.replace(/\s/g, "")
    if (id.length != 16 || !/^[a-f0-9]+$/i.test(id)) return undefined
    return fromHex(id)
}

export function parseDualDeviceId(id: string) {
    const rid = parseDeviceId(id)
    toggleBit(rid, 0)
    return rid
}

export function dualDeviceId(id: string): string {
    return toHex(parseDualDeviceId(id))
}

/**
 * Check if the left device identifier is a bootloader dual of the right identifier
 * @param left
 * @param right
 * @returns
 */
export function isDualDeviceId(left: string, right: string) {
    const lid = parseDeviceId(left)
    const rid = parseDualDeviceId(right)
    return bufferEq(lid, rid)
}

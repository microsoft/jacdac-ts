import deviceRegistryData from "../../jacdac-spec/dist/devices.json"
import { CHANGE, DOCS_ROOT } from "./constants"
import { JDEventSource } from "./eventsource"
import { Flags } from "./flags"
import { cryptoRandomUint32 } from "./random"
import { serviceSpecificationFromClassIdentifier } from "./spec"
import { toFullHex, unique } from "./utils"

function looksRandom(n: number) {
    const s = n.toString(16)
    const h = "0123456789abcdef"
    for (let i = 0; i < h.length; ++i) {
        const hh = h[i]
        if (s.indexOf(hh + hh + hh) >= 0) return false
    }
    if (/f00d|dead|deaf|beef/.test(s)) return false
    return true
}

export interface DeviceSpecificationOptions {
    includeDeprecated?: boolean
    includeExperimental?: boolean
    transport?: jdspec.TransportType | string
}

export interface DeviceCatalogOptions {
    /**
     * Additional vendor ids to use when connecting to serial
     */
    serialVendorIds?: number[]
}

/**
 * The device catalog. May emit a CHANGE event if updated
 */
export class DeviceCatalog extends JDEventSource {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _specifications: jdspec.DeviceSpec[] = deviceRegistryData as any
    readonly options: DeviceCatalogOptions
    constructor(options?: DeviceCatalogOptions) {
        super()
        this.options = options || {}
    }

    /**
     * Update specifications list and emit `change` event.
     * @param specifications
     */
    update(specifications: jdspec.DeviceSpec[]) {
        if (
            JSON.stringify(this._specifications) !==
            JSON.stringify(specifications)
        ) {
            this._specifications = specifications.slice(0)
            this.emit(CHANGE)
        }
    }

    /**
     * Query device specifications
     * @param options
     * @returns
     */
    specifications(options?: DeviceSpecificationOptions): jdspec.DeviceSpec[] {
        const { includeDeprecated, includeExperimental, transport } =
            options || {}
        let r = this._specifications.slice(0)
        if (!includeDeprecated) r = r.filter(d => d.status !== "deprecated")
        if (!includeExperimental)
            r = r.filter(d => d.status !== "experimental" && !!d.storeLink)
        if (transport) r = r.filter(d => d.transport?.type === transport)
        return r
    }

    /**
     * Query device specification from a product identifier
     * @param productIdentifier
     * @returns
     */
    specificationFromProductIdentifier(
        productIdentifier: number,
    ): jdspec.DeviceSpec {
        if (isNaN(productIdentifier)) return undefined

        const spec = this._specifications.find(
            spec => spec.productIdentifiers?.indexOf(productIdentifier) > -1,
        )
        return spec
    }

    specificationFromIdentifier(id: string): jdspec.DeviceSpec {
        if (id === undefined) return undefined

        const spec = this._specifications.find(spec => spec.id === id)
        return spec
    }

    /**
     * Gets the list of devices that use this service class
     * @param serviceClass
     * @category Specification
     */
    specificationsForService(
        serviceClass: number,
        options?: DeviceSpecificationOptions,
    ): jdspec.DeviceSpec[] {
        if (isNaN(serviceClass)) return undefined
        return this.specifications(options).filter(
            spec => spec.services?.indexOf(serviceClass) > -1,
        )
    }

    /**
     * Gets the list of vendor ids for a given transport
     * @param type
     * @returns
     */
    vendorIds(type: "serial" | string) {
        const ids = this._specifications
            .filter(spec => spec.transport?.type === type)
            .map(spec => spec.transport.vendorId)
        if (type === "serial") {
            const { serialVendorIds } = this.options
            if (serialVendorIds) serialVendorIds.forEach(id => ids.push(id))
        }
        return unique(ids.filter(v => !isNaN(v)))
    }

    /**
     * Checks if a vendor id match the transport
     * @param type
     * @param id
     * @returns
     */
    matchVendorId(type: string, id: number) {
        if (isNaN(id)) return false
        if (Flags.developerMode) return true
        const ids = this.vendorIds(type)
        return ids.indexOf(id) > -1
    }

    /**
     * Generates a unique firmware identifier
     * @returns
     */
    uniqueFirmwareId(decimal?: boolean) {
        const genFirmwareId = () => {
            const n = cryptoRandomUint32(1)
            if (n === undefined) return undefined
            return (n[0] & 0xfff_ffff) | 0x3000_0000
        }

        let id = genFirmwareId()
        while (
            id !== undefined &&
            (!looksRandom(id) ||
                deviceCatalog.specificationFromProductIdentifier(id))
        ) {
            id = genFirmwareId()
        }
        return id !== undefined && (decimal ? id.toString() : toFullHex([id]))
    }

    /**
     * Generate a unique service identifier
     * @returns
     */
    uniqueServiceId() {
        const genServId = () => {
            const n = cryptoRandomUint32(1)
            if (n === undefined) return undefined
            return (n[0] & 0xfff_ffff) | 0x1000_0000
        }

        let id = genServId()
        while (
            id !== undefined &&
            (!looksRandom(id) || serviceSpecificationFromClassIdentifier(id))
        ) {
            id = genServId()
        }
        return id !== undefined && toFullHex([id])
    }

    /**
     * Generate a unique device identifier
     * @returns
     */
    uniqueDeviceId() {
        const n = cryptoRandomUint32(2)
        return n !== undefined && toFullHex([n[0], n[1]])
    }
}

/**
 * Generate a URL image for jacdac-docs
 */
export function deviceCatalogImage(
    specification: jdspec.DeviceSpec | undefined,
    size?: "avatar" | "lazy" | "catalog" | "preview" | "full" | "list",
    docsRoot?: string,
) {
    const sz = size || "full"
    const root = docsRoot || DOCS_ROOT
    return (
        specification &&
        `${root}images/devices/${identifierToUrlPath(
            specification.id,
        )}.${sz}.jpg`
    )
}

/**
 * Given an identifier, generate a url path
 */
export function identifierToUrlPath(id: string) {
    if (!id) return id

    const escape = (s: string) => s.replace(/[.:]/g, "").toLowerCase()

    const parts = id.split(/-/g)
    if (parts.length === 1) return id.replace(/[.:]/g, "").toLowerCase()
    return `${parts.slice(0, -1).map(escape).join("-")}/${escape(
        parts[parts.length - 1],
    )}`
}

/**
 * The device catalog
 */
export const deviceCatalog = new DeviceCatalog()

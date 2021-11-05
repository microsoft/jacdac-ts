import deviceRegistryData from "../../jacdac-spec/dist/devices.json"
import { CHANGE } from "./constants"
import JDEventSource from "./eventsource"
import { cryptoRandomUint32 } from "./random"
import { serviceSpecificationFromClassIdentifier } from "./spec"
import { toFullHex } from "./utils"

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
}

/**
 * The device catalog. May emit a CHANGE event if updated
 */
export class DeviceCatalog extends JDEventSource {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _specifications: jdspec.DeviceSpec[] = deviceRegistryData as any
    constructor() {
        super()
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
        const { includeDeprecated, includeExperimental } = options || {}
        let r = this._specifications.slice(0)
        if (!includeDeprecated) r = r.filter(d => d.status !== "deprecated")
        if (!includeExperimental) r = r.filter(d => d.status !== "experimental")
        return r
    }

    /**
     * Query device specification from a product identifier
     * @param productIdentifier
     * @returns
     */
    specificationFromProductIdentifier(
        productIdentifier: number
    ): jdspec.DeviceSpec {
        if (isNaN(productIdentifier)) return undefined

        const spec = this._specifications.find(
            spec => spec.productIdentifiers?.indexOf(productIdentifier) > -1
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
    specificationsForService(serviceClass: number): jdspec.DeviceSpec[] {
        if (isNaN(serviceClass)) return undefined
        return this._specifications.filter(
            spec => spec.services?.indexOf(serviceClass) > -1
        )
    }

    /**
     * Gets the list of vendor ids for a given transport
     * @param type
     * @returns
     */
    vendorIds(type: string) {
        return this._specifications
            .filter(spec => spec.transport?.type === type)
            .map(spec => spec.transport.vendorId)
            .filter(v => !!v)
    }

    /**
     * Checks if a vendor id match the transport
     * @param type
     * @param id
     * @returns
     */
    matchVendorId(type: string, id: number) {
        if (isNaN(id)) return false

        const ids = this.vendorIds(type)
        return ids.indexOf(id) > -1
    }

    /**
     * Generates a unique firmware identifier
     * @returns
     */
    uniqueFirmwareId() {
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
        return id !== undefined && toFullHex([id])
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
 * The device catalog
 */
export const deviceCatalog = new DeviceCatalog()

import deviceRegistryData from "../../jacdac-spec/dist/devices.json"
import { CHANGE } from "./constants"
import JDEventSource from "./eventsource"

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
}

/**
 * The device catalog
 */
export const deviceCatalog = new DeviceCatalog()

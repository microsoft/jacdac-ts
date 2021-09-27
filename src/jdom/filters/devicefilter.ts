/**
 * A device filter
 * @category JDOM
 */
export interface DeviceFilter {
    /**
     * Matches devices with a service matching this name
     */
    serviceName?: string
    /**
     * Matches devices that have this service
     */
    serviceClass?: number
    /**
     * Excludes the infrastructure devices
     */
    ignoreInfrastructure?: boolean
    /**
     * Matches devices that have already announced their services
     */
    announced?: boolean
    /**
     * Ignore virtual devices used as state simulators
     */
    ignoreSimulators?: boolean
    /**
     * Matches devices with a specific product identifier
     */
    productIdentifier?: boolean
    /**
     * Matches physical devices exclusively
     */
    physical?: boolean
}
export default DeviceFilter

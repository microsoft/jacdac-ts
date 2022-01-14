/**
 * A service filter
 * @category JDOM
 */
export interface ServiceFilter {
    /**
     * Match services at the given service index
     */
    serviceIndex?: number
    /**
     * Match services with the given name
     */
    serviceName?: string
    /**
     * Match services with the given service class
     */
    serviceClass?: number
    /**
     * Match services which have a known specifications
     */
    specification?: boolean
    /**
     * Match or excludes mixin services
     */
    mixins?: boolean
    /**
     * Is a sensor service
     */
    sensor?: boolean
}


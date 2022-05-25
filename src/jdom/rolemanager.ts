import {
    BOUND,
    CHANGE,
    DEVICE_ANNOUNCE,
    DEVICE_DISCONNECT,
    ROLE_BOUND,
    ROLE_UNBOUND,
    UNBOUND,
} from "./constants"
import { JDBus } from "./bus"
import { JDDevice } from "./device"
import { JDService } from "./service"
import { serviceSpecificationFromClassIdentifier } from "./spec"
import { JDClient } from "./client"

/**
 * A binding from a name to a service
 * @category Roles
 */
export interface RoleBinding {
    role: string
    serviceClass: number
    preferredDeviceId?: string
    preferredServiceIndex?: number

    /**
     * Used internally for serialization 
     */
    serviceId?: string
}

/**
 * A role manager
 * @category Roles
 */
export class RoleManager extends JDClient {
    private readonly _roles: RoleBinding[] = []

    /**
     * Gets the bus for this role
     */
    public readonly bus: JDBus

    constructor(bus: JDBus, configuration?: RoleBinding[]) {
        super()
        this.bus = bus
        this.mount(
            this.bus.subscribe(DEVICE_ANNOUNCE, this.addServices.bind(this))
        )
        this.mount(
            this.bus.subscribe(
                DEVICE_DISCONNECT,
                this.removeServices.bind(this)
            )
        )
        this.updateRoles(configuration || [])
    }

    /**
     * Indicates if all roles are bound.
     */
    get isBound() {
        return this._roles.every(({ serviceId }) => !!this.bus.node(serviceId))
    }

    /**
     * Gets the list of roles tracked by the manager
     */
    roles(bound: boolean = undefined): RoleBinding[] {
        if (bound !== undefined)
            return this._roles.filter(({ serviceId }) => !!serviceId === bound)
        else return this._roles.slice(0)
    }
    private get hash() {
        return JSON.stringify(this._roles)
    }

    /**
     * Used to restore computed bindings
     * @param newRoles
     */
    updateBindings(newRoles: RoleBinding[]) {
        const oldBound = this.isBound
        let changed = false
        this._roles
            .map(role => ({
                role,
                newRole: newRoles.find(r => r.role === role.role),
            }))
            .filter(
                ({ role, newRole }) =>
                    newRole && role.serviceId !== newRole.serviceId
            )
            .forEach(({ role, newRole }) => {
                role.serviceId = newRole.serviceId
                changed = true
            })

        if (changed) this.emitBoundEvents(oldBound)
    }

    /**
     * Updates the list of roles
     * @param newRoles
     */
    updateRoles(newRoles: RoleBinding[]) {
        const oldBound = this.isBound
        const oldHash = this.hash

        // remove unknown roles
        const supportedNewRoles = newRoles.filter(({ serviceClass }) =>
            serviceSpecificationFromClassIdentifier(serviceClass)
        )

        // ensure that preferred deviceid/service index is unique
        const preferreds: Set<string> = new Set()
        for (const role of supportedNewRoles.filter(
            r => !!r.preferredDeviceId
        )) {
            const key =
                role.preferredDeviceId + (role.preferredServiceIndex || -1)
            if (preferreds.has(key)) {
                role.preferredDeviceId = undefined
                role.preferredServiceIndex = undefined
            } else preferreds.add(key)
        }

        // unbind removed roles
        let i = 0
        while (i < this._roles.length) {
            const role = this._roles[i]
            if (!supportedNewRoles.find(r => r.role === role.role)) {
                this._roles.splice(i, 1)
                this.emit(ROLE_UNBOUND, role.role)
            } else {
                i++
            }
        }

        // update or add roles
        for (const newRole of supportedNewRoles) {
            const existingRole = this._roles.find(r => r.role === newRole.role)
            if (!existingRole) {
                // added role
                this._roles.push({ ...newRole })
            } else {
                const bindingChanged =
                    existingRole.serviceClass !== newRole.serviceClass ||
                    existingRole.preferredDeviceId !=
                        newRole.preferredDeviceId ||
                    existingRole.preferredServiceIndex !=
                        newRole.preferredServiceIndex

                existingRole.serviceClass = newRole.serviceClass
                existingRole.preferredDeviceId = newRole.preferredDeviceId
                existingRole.preferredServiceIndex =
                    newRole.preferredServiceIndex
                // unbinding existing service
                if (existingRole.serviceId && bindingChanged) {
                    existingRole.serviceId = undefined
                    this.emit(ROLE_UNBOUND, existingRole.role)
                }
            }

            if (newRole.preferredDeviceId) {
                // make sure that the preferred device id is free
                const otherBinding = this._roles.find(
                    r =>
                        r.serviceId &&
                        (this.bus.node(r.serviceId) as JDService)?.device
                            .deviceId === newRole.preferredDeviceId &&
                        (isNaN(newRole.preferredServiceIndex) ||
                            (this.bus.node(r.serviceId) as JDService)
                                ?.serviceIndex ===
                                newRole.preferredServiceIndex)
                )
                if (otherBinding) {
                    otherBinding.serviceId = undefined
                    this.emit(ROLE_UNBOUND, otherBinding.role)
                }
            }
            // role unmodified
        }
        // bound services
        const changed = oldHash !== this.hash
        this.bindServices(changed)
        this.emitBoundEvents(oldBound)
    }

    /**
     * Resolves the service bound to a given role.
     * @param role
     * @returns
     */
    public service(role: string): JDService {
        const id = this._roles.find(r => r.role === role)?.serviceId
        return this.bus.node(id) as JDService
    }

    /**
     * Updates or creates a new role
     * @param role name of the role
     * @param serviceClass desired service class
     * @param preferredDeviceId optional preferred device id
     * @returns
     */
    public updateRole(
        role: string,
        serviceClass: number,
        preferredDeviceId?: string,
        preferredServiceIndex?: number
    ) {
        const newRoles = this._roles.slice(0).map(r => ({ ...r }))
        let binding = newRoles.find(r => r.role === role)
        if (binding) {
            binding.serviceId = undefined
            binding.preferredDeviceId = preferredDeviceId
            binding.preferredServiceIndex = preferredServiceIndex
        } else {
            binding = {
                role,
                serviceClass,
                preferredDeviceId,
                preferredServiceIndex,
            }
            newRoles.push(binding)
        }
        // find any other binding with the same preferences and clear it
        if (preferredDeviceId) {
            const other = this._roles.find(
                r =>
                    r !== binding &&
                    r.preferredDeviceId === preferredDeviceId &&
                    r.preferredServiceIndex === preferredServiceIndex
            )
            if (other) {
                other.preferredDeviceId = undefined
                other.preferredServiceIndex = undefined
            }
        }
        this.updateRoles(newRoles)
    }

    private emitBoundEvents(oldBound: boolean) {
        const bound = this.isBound
        if (oldBound !== bound) this.emit(bound ? BOUND : UNBOUND)
    }

    // TODO: need to respect other (unbound) role's preferredDeviceId
    private bindRole(role: RoleBinding) {
        // find a service that is not yet allocated
        const bound = this.roles(true)
        const unboundServices = this.bus
            .services({
                ignoreInfrastructure: true,
                serviceClass: role.serviceClass,
            })
            .filter(s => !bound.find(r => r.serviceId === s.id))
        const boundServices = bound
            .map(r => r.serviceId)
            .map(serviceId => this.bus.node(serviceId) as JDService)
            .filter(srv => !!srv)

        // pick the first unbound service
        let theOne = unboundServices[0]

        // if there are constraint, try a better fit
        if (role.preferredDeviceId) {
            const newOne = [...unboundServices, ...boundServices].find(
                s =>
                    s.device.deviceId === role.preferredDeviceId &&
                    (isNaN(role.preferredServiceIndex) ||
                        role.preferredServiceIndex === s.serviceIndex)
            )
            if (newOne) {
                theOne = newOne
            }
        }

        if (theOne) {
            role.serviceId = theOne?.id
            this.emit(ROLE_BOUND, role.role)
            return true
        } else return false
    }

    private bindServices(changed?: boolean) {
        const r = this.roles().sort((l, r) => {
            let c = 0
            if (r.preferredDeviceId || l.preferredDeviceId)
                c = -(l.preferredDeviceId || "").localeCompare(
                    r.preferredDeviceId || ""
                )
            if (c != 0) return c
            if (
                !isNaN(l.preferredServiceIndex) ||
                !isNaN(r.preferredServiceIndex)
            )
                c =
                    -(l.preferredServiceIndex || 0) +
                    (r.preferredServiceIndex || 0)
            return c
        })
        r.forEach(binding => {
            if (this.bindRole(binding)) changed = true
        })
        if (changed) this.emit(CHANGE)
    }

    private addServices(dev: JDDevice) {
        if (dev === this.bus.selfDevice) return
        this.bindServices()
    }

    private removeServices(dev: JDDevice) {
        let changed = false
        this._roles
            .filter(
                r => (this.bus.node(r.serviceId) as JDService)?.device === dev
            )
            .forEach(r => {
                r.serviceId = undefined
                this.emit(ROLE_UNBOUND, r.role)
                changed = true
            })
        this.bindServices(changed)
    }

    toString() {
        return this._roles
            .map(({ role, serviceId }) => `${role}->${serviceId || "?"}`)
            .join(",")
    }
}

import {
    BOUND,
    CHANGE,
    DEVICE_ANNOUNCE,
    DEVICE_DISCONNECT,
    ROLE_BOUND,
    ROLE_UNBOUND,
    UNBOUND,
} from "./constants"
import JDBus from "./bus"
import JDDevice from "./device"
import JDService from "./service"
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
    service?: JDService
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

    constructor(bus: JDBus) {
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

        this.bindServices()
    }

    /**
     * Indicates if all roles are bound.
     */
    get isBound() {
        return this._roles.every(({ service }) => !!service)
    }

    /**
     * Gets the list of roles tracked by the manager
     */
    roles(bound: boolean = undefined) {
        if (bound !== undefined)
            return this._roles.filter(({ service }) => !!service === bound)
        else return this._roles.slice(0)
    }

    /**
     * Updates the list of roles
     * @param newRoles
     */
    updateRoles(newRoles: RoleBinding[]) {
        const oldBound = this.isBound
        let changed = false

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
                changed = true
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
                changed = true
                this._roles.push({ ...newRole })
            } else {
                const bindingChanged =
                    existingRole.serviceClass !== newRole.serviceClass ||
                    existingRole.preferredDeviceId !=
                        newRole.preferredDeviceId ||
                    existingRole.preferredServiceIndex !=
                        newRole.preferredServiceIndex
                changed = changed || bindingChanged

                existingRole.serviceClass = newRole.serviceClass
                existingRole.preferredDeviceId = newRole.preferredDeviceId
                existingRole.preferredServiceIndex =
                    newRole.preferredServiceIndex
                // unbinding existing service
                if (existingRole.service && bindingChanged) {
                    existingRole.service = undefined
                    changed = true
                    this.emit(ROLE_UNBOUND, existingRole.role)
                }
            }

            if (newRole.preferredDeviceId) {
                // make sure that the preferred device id is free
                const otherBinding = this._roles.find(
                    r =>
                        r.service &&
                        r.service.device.deviceId ===
                            newRole.preferredDeviceId &&
                        (isNaN(newRole.preferredServiceIndex) ||
                            r.service.serviceIndex ===
                                newRole.preferredServiceIndex)
                )
                if (otherBinding) {
                    changed = true
                    otherBinding.service = undefined
                    this.emit(ROLE_UNBOUND, otherBinding.role)
                }
            }
            // role unmodified
        }
        // bound services
        this.bindServices(changed)
        this.emitBoundEvents(oldBound)
    }

    /**
     * Resolves the service bound to a given role.
     * @param role
     * @returns
     */
    public service(role: string): JDService {
        return this._roles.find(r => r.role === role)?.service
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
            binding.service = undefined
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
            .filter(s => !bound.find(r => r.service === s))
        const boundServices = bound.map(r => r.service).filter(srv => !!srv)

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
            role.service = theOne
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
            .filter(r => r.service?.device === dev)
            .forEach(r => {
                r.service = undefined
                this.emit(ROLE_UNBOUND, r.role)
                changed = true
            })
        this.bindServices(changed)
    }

    toString() {
        return this._roles
            .map(({ role, service }) => `${role}->${service || "?"}`)
            .join(",")
    }
}
export default RoleManager

/**
 * Tracks a set of roles
 * @param bus bus hosting the devices
 * @param bindings map of role names to device service pairs
 * @param onUpdate callback to run whenver role assignments change
 * @param options Additional options
 * @returns A unsubscribe callback to cleanup handlers
 * @category Roles
 */
export function startRoles<
    TRoles extends Record<
        string,
        {
            serviceClass: number
            preferredDeviceId?: string
            preferredServiceIndex?: number
        }
    >
>(
    bus: JDBus,
    bindings: TRoles,
    onUpdate: (roles: Record<keyof TRoles, JDService>) => void,
    options?: {
        /**
         * Calls update even if not all role around bound
         */
        incomplete?: boolean
    }
) {
    const { incomplete } = options || {}
    const roleManager = new RoleManager(bus)
    roleManager.updateRoles(
        Object.keys(bindings).map(role => ({
            role,
            serviceClass: bindings[role].serviceClass,
            preferredDeviceId: bindings[role].preferredDeviceId,
            preferredServiceIndex: bindings[role].preferredServiceIndex,
        }))
    )
    const roles = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r: Record<keyof TRoles, JDService> = {} as any
        for (const key in bindings) {
            const srv = roleManager.service(key)
            if (srv) r[key] = srv
        }
        return r
    }
    const update = () => {
        if (!incomplete && !roleManager.isBound) return
        onUpdate(roles())
    }
    const unsubscribe = roleManager.subscribe(CHANGE, update)
    update()
    return unsubscribe
}

/*
function test(bus: JDBus) {
    const bindings = {
        thermo1: { serviceClass: SRV_BUTTON },
        thermo2: { serviceClass: SRV_BUTTON },
    }
    trackRoles(
        bus,
        bindings,
        ({ thermo1, thermo2 }) => {
            console.log({ thermo1, thermo2 })
        },
        { incomplete: true }
    )
}
*/

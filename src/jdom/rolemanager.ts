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
            } else if (existingRole.serviceClass !== newRole.serviceClass) {
                // modified type, force rebinding
                changed = true
                existingRole.serviceClass = newRole.serviceClass
                if (existingRole.service) {
                    existingRole.service = undefined
                    this.emit(ROLE_UNBOUND, existingRole.role)
                }
            } // else unmodifed role
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
        preferredDeviceId?: string
    ) {
        if (!serviceSpecificationFromClassIdentifier(serviceClass)) return // unknown role type

        let binding = this._roles.find(r => r.role === role)

        // check if we already have this role
        if (binding && serviceClass === binding.serviceClass) {
            if (!binding.service && preferredDeviceId) {
                binding.preferredDeviceId = preferredDeviceId
            }
            return
        }
        const oldBound = this.isBound
        // new role
        binding = { role, serviceClass, preferredDeviceId }
        this._roles.push(binding)
        if (!this.bindRole(binding)) {
            this.emit(ROLE_UNBOUND, role)
        }
        this.emit(CHANGE)
        this.emitBoundEvents(oldBound)
    }

    private emitBoundEvents(oldBound: boolean) {
        const bound = this.isBound
        if (oldBound !== bound) this.emit(bound ? BOUND : UNBOUND)
    }

    // TODO: need to respect other (unbound) role's preferredDeviceId
    private bindRole(role: RoleBinding) {
        const ret = this.bus
            .services({ ignoreInfrastructure: true, serviceClass: role.serviceClass })
            .filter(s => !this.roles(true).find(r => r.service === s))
        if (ret.length) {
            let theOne = ret[0]
            if (role.preferredDeviceId) {
                const newOne = ret.find(
                    s => s.device.deviceId === role.preferredDeviceId
                )
                if (newOne) theOne = newOne
            }
            role.service = theOne
            this.emit(ROLE_BOUND, role.role)
            return true
        }
        return false
    }

    private bindServices(changed?: boolean) {
        this.roles(false).forEach(binding => {
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
        { serviceClass: number; preferredDeviceId?: string }
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
): () => void {
    const { incomplete } = options || {}
    const roleManager = new RoleManager(bus)
    roleManager.updateRoles(
        Object.keys(bindings).map(role => ({
            role,
            serviceClass: bindings[role].serviceClass,
            preferredDeviceId: bindings[role].preferredDeviceId,
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

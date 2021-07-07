import {
    BOUND,
    CHANGE,
    DEVICE_ANNOUNCE,
    DEVICE_DISCONNECT,
    ROLE_BOUND,
    ROLE_UNBOUND,
    UNBOUND,
} from "../jdom/constants"
import { JDBus } from "../jdom/bus"
import { JDDevice } from "../jdom/device"
import { JDService } from "../jdom/service"
import { serviceSpecificationFromClassIdentifier } from "../jdom/spec"
import { JDClient } from "../jdom/client"

export interface RoleBinding {
    role: string
    serviceClass: number
    preferredDeviceId?: string
    service?: JDService
}

// TODO: replicate MakeCode role manager logic
export default class RoleManager extends JDClient {
    private readonly _roles: RoleBinding[] = []

    constructor(private readonly _bus: JDBus) {
        super()

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

    get bus() {
        return this._bus
    }

    get roles() {
        return this._roles.slice(0)
    }

    get boundRoles() {
        return this._roles.filter(r => !!r.service)
    }

    get unboundRoles() {
        return this._roles.filter(r => !r.service)
    }

    get bound() {
        return this._roles.every(({ service }) => !!service)
    }

    setRoles(newRoles: RoleBinding[]) {
        const oldBound = this.bound
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

    public getService(role: string): JDService {
        return this._roles.find(r => r.role === role)?.service
    }

    public addRoleService(
        role: string,
        serviceClass: number,
        preferredDeviceId?: string
    ) {
        if (!serviceSpecificationFromClassIdentifier(serviceClass)) return // unknown role type

        let binding = this._roles.find(r => r.role === role)

        // check if we already have this role
        if (binding && serviceClass === binding.serviceClass) return

        const oldBound = this.bound
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
        const bound = this.bound
        if (oldBound !== bound) this.emit(bound ? BOUND : UNBOUND)
    }

    // TODO: need to respect other (unbound) role's preferredDeviceId
    private bindRole(role: RoleBinding) {
        const ret = this.bus
            .services({ ignoreSelf: true, serviceClass: role.serviceClass })
            .filter(s => !this.boundRoles.find(r => r.service === s))
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
        this.unboundRoles.forEach(binding => {
            if (this.bindRole(binding))
                changed = true
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
}

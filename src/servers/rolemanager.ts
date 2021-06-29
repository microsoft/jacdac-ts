import { JDEventSource } from "../jdom/eventsource"
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
import { JDClient } from "../jdom/client"

export interface RoleBinding {
    role: string
    serviceClass: number
    service?: JDService
}

// TODO: replicate MakeCode role manager logic
export default class RoleManager extends JDClient {
    private readonly _roles: RoleBinding[] = []

    constructor(private readonly bus: JDBus) {
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

        this.bus
            .devices({ ignoreSelf: true, announced: true })
            .forEach(dev => this.addServices(dev))

        this.on(ROLE_UNBOUND, role => console.log(`role unbound`, { role }))
        this.on(ROLE_BOUND, role => console.log(`role bound`, { role }))
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

    /**
     * All roles around bound
     */
    get bound() {
        return this._roles.every(({ service }) => !!service)
    }

    setRoles(
        newRoles: {
            role: string
            serviceClass: number
        }[]
    ) {
        if (!newRoles?.length) return

        const oldBound = this.bound
        let changed = false

        // unbind removed roles
        let i = 0
        while (i < this._roles.length) {
            const role = this._roles[i]
            if (!newRoles.find(r => r.role === role.role)) {
                changed = true
                this._roles.splice(i, 1)
                this.emit(ROLE_UNBOUND, role.role)
            } else {
                i++
            }
        }

        // update or add roles
        for (const newRole of newRoles) {
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

    public addRoleService(role: string, serviceClass: number) {
        let binding = this._roles.find(r => r.role === role)

        // check if we already have this role
        if (binding && serviceClass === binding.serviceClass) return

        const oldBound = this.bound
        // new role
        binding = { role, serviceClass }
        this._roles.push(binding)

        const ret = this.bus
            .services({ ignoreSelf: true, serviceClass })
            .find(s => !this._roles.find(r => r.service === s))
        if (ret) {
            binding.service = ret
            this.emit(ROLE_BOUND, role)
        } else {
            this.emit(ROLE_UNBOUND, role)
        }
        this.emit(CHANGE)
        this.emitBoundEvents(oldBound)
    }

    private emitBoundEvents(oldBound: boolean) {
        const bound = this.bound
        if (oldBound !== bound) this.emit(bound ? BOUND : UNBOUND)
    }

    private bindServices(changed?: boolean) {
        this.unboundRoles.forEach(binding => {
            const boundRoles = this.boundRoles
            const service = this.bus
                .services({
                    ignoreSelf: true,
                    serviceClass: binding.serviceClass,
                })
                .find(srv => !boundRoles.find(b => b.service === srv))
            binding.service = service
            this.emit(ROLE_BOUND, binding.role)
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

    public getRoleService(role: string): JDService {
        return this._roles.find(r => r.role === role)?.service
    }
}

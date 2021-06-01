import { JDEventSource } from "../jdom/eventsource"
import { CHANGE, DEVICE_ANNOUNCE, DEVICE_DISCONNECT } from "../jdom/constants"
import { JDBus } from "../jdom/bus"
import { JDDevice } from "../jdom/device"
import { JDService } from "../jdom/service"
import { ROLE_BOUND, ROLE_UNBOUND } from "./utils"
import { serviceSpecificationFromName } from "../jdom/spec"

// TODO: replicate MakeCode role manager logic
export class RoleManager extends JDEventSource {
    private readonly _roles: {
        role: string
        serviceShortId: string
        service?: JDService
    }[] = []

    constructor(private readonly bus: JDBus) {
        super()

        this.bus.on(DEVICE_ANNOUNCE, this.addServices.bind(this))
        this.bus.on(DEVICE_DISCONNECT, this.removeServices.bind(this))

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

    setRoles(
        newRoles: {
            role: string
            serviceShortId: string
        }[]
    ) {
        const roles = this.roles

        // remove unknown roles

        const supportedNewRoles = newRoles.filter(({ serviceShortId }) =>
            serviceSpecificationFromName(serviceShortId)
        )
        console.debug(`set roles`, { roles, newRoles, supportedNewRoles })

        // removed roles
        for (const newRole of supportedNewRoles) {
            const existingRole = roles.find(r => r.role === newRole.role)
            if (!existingRole) {
                // added role
                this._roles.push({ ...newRole })
            } else if (existingRole.serviceShortId !== newRole.serviceShortId) {
                // modified type, force rebinding
                existingRole.serviceShortId = newRole.serviceShortId
                if (existingRole.service) {
                    existingRole.service = undefined
                    this.emit(ROLE_UNBOUND, newRole.role)
                    this.emit(CHANGE)
                }
            } // else unmodifed role
        }

        // bound services
        this.bindServices()
    }

    private bindServices() {
        this.unboundRoles.forEach(binding => {
            const boundRoles = this.boundRoles
            const service = this.bus
                .services({
                    ignoreSelf: true,
                    serviceName: binding.serviceShortId,
                })
                .find(srv => !boundRoles.find(b => b.service === srv))
            binding.service = service
            this.emit(ROLE_BOUND, binding.role)
            this.emit(CHANGE)
        })
    }

    private addServices(dev: JDDevice) {
        if (dev === this.bus.selfDevice) return
        this.bindServices()
    }

    private removeServices(dev: JDDevice) {
        this._roles
            .filter(r => r.service?.device === dev)
            .forEach(r => {
                r.service = undefined
                this.emit(ROLE_UNBOUND, r.role)
                this.emit(CHANGE)
            })
    }

    public getService(role: string): JDService {
        return this._roles.find(r => r.role === role)?.service
    }

    public addRoleService(role: string, serviceShortId: string) {
        if (!serviceSpecificationFromName(serviceShortId)) return // unknown role type

        let binding = this._roles.find(r => r.role === role)

        // check if we already have this role
        if (binding && serviceShortId === binding.serviceShortId) return

        // new role
        binding = { role, serviceShortId }
        this._roles.push(binding)

        const ret = this.bus
            .services({ ignoreSelf: true, serviceName: serviceShortId })
            .find(s => !this._roles.find(r => r.service === s))
        if (ret) {
            binding.service = ret
            this.emit(ROLE_BOUND, role)
            this.emit(CHANGE)
        } else {
            this.emit(ROLE_UNBOUND, role)
            this.emit(CHANGE)
        }
    }
}

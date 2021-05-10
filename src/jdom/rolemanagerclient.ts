import {
    addServiceProvider,
    serviceProviderDefinitionFromServiceClass,
} from "../servers/servers"
import {
    CHANGE,
    DEVICE_ANNOUNCE,
    DISCONNECT,
    ERROR,
    EVENT,
    RoleManagerCmd,
    ROLE_MANAGER_POLL,
    SELF_ANNOUNCE,
    SRV_CONTROL,
    SRV_LOGGER,
    SRV_ROLE_MANAGER,
    SystemEvent,
} from "./constants"
import { jdpack, jdunpack } from "./pack"
import Packet from "./packet"
import { InPipeReader } from "./pipes"
import { JDService } from "./service"
import { JDServiceClient } from "./serviceclient"
import {
    arrayConcatMany,
    debounceAsync,
    fromHex,
    groupBy,
    toHex,
} from "./utils"

export interface Role {
    deviceId: string
    serviceClass: number
    serviceIndex: number
    name: string
}

export class RoleManagerClient extends JDServiceClient {
    private _roles: Role[] = []
    private _needRefresh = true
    private _lastRefreshAttempt = 0

    public readonly startRefreshRoles: () => void

    constructor(service: JDService) {
        super(service)
        const changeEvent = service.event(SystemEvent.Change)

        // always debounce refresh roles
        this.startRefreshRoles = debounceAsync(
            this.refreshRoles.bind(this),
            200
        )

        // role manager emits change events
        this.mount(changeEvent.subscribe(EVENT, this.handleChange.bind(this)))
        // assign roles when need device enter the bus
        this.mount(
            this.bus.subscribe(DEVICE_ANNOUNCE, this.assignRoles.bind(this))
        )
        // unmount when device is removed
        this.mount(
            service.device.subscribe(DISCONNECT, () => {
                if (this.bus.roleManager?.service === this.service)
                    this.bus.setRoleManagerService(undefined)
            })
        )
        // clear on unmount
        this.mount(this.clearRoles.bind(this))
        // retry to get roles on every self-announce
        this.mount(
            this.bus.subscribe(
                SELF_ANNOUNCE,
                this.handleSelfAnnounce.bind(this)
            )
        )
    }

    private handleSelfAnnounce() {
        if (
            this._needRefresh &&
            this.bus.timestamp - this._lastRefreshAttempt > ROLE_MANAGER_POLL
        ) {
            console.debug("self announce refresh")
            this.startRefreshRoles()
        }
    }

    get roles() {
        return this._roles
    }

    private async handleChange() {
        this.startRefreshRoles()
    }

    private async refreshRoles() {
        if (this.unmounted) return

        this._needRefresh = false
        await this.collectRoles()

        if (this.unmounted) return
        this.assignRoles()
    }

    private async collectRoles() {
        this._lastRefreshAttempt = this.bus.timestamp
        const previousRolesHash = JSON.stringify(this._roles)
        try {
            const inp = new InPipeReader(this.bus)
            await this.service.sendPacketAsync(
                inp.openCommand(RoleManagerCmd.ListRequiredRoles),
                true
            )
            // collect all roles
            const roles: Role[] = []
            for (const buf of await inp.readData()) {
                const [devidbuf, serviceClass, serviceIndex, name] = jdunpack<
                    [Uint8Array, number, number, string]
                >(buf, "b[8] u32 u8 s")
                const deviceId = toHex(devidbuf)
                roles.push({ deviceId, serviceClass, serviceIndex, name })
            }
            // store result if changed
            if (JSON.stringify(roles) !== previousRolesHash) {
                this._roles = roles
                this.emit(CHANGE)
            }
        } catch (e) {
            this._needRefresh = true
            this.emit(ERROR, e)
        }
    }

    static unroledSrvs = [SRV_CONTROL, SRV_ROLE_MANAGER, SRV_LOGGER]

    private assignRoles() {
        this.bus
            .services()
            .filter(
                srv =>
                    RoleManagerClient.unroledSrvs.indexOf(srv.serviceClass) < 0
            )
            .forEach(srv => this.assignRole(srv))
    }

    private assignRole(service: JDService) {
        const deviceId = service.device.deviceId
        const serviceIndex = service.serviceIndex
        const role = this._roles.find(
            r => r.deviceId === deviceId && r.serviceIndex === serviceIndex
        )
        //console.debug(`role ${service.id} -> ${role?.role}`, { service })
        service.role = role?.name
    }

    private clearRoles() {
        this.bus.services().forEach(srv => (srv.role = undefined))
    }

    hasRoleForService(service: JDService) {
        const { serviceClass } = service
        return !!this._roles?.find(r => r.serviceClass === serviceClass)
    }

    compatibleRoles(service: JDService): Role[] {
        const { serviceClass } = service
        return this._roles?.filter(r => r.serviceClass === serviceClass)
    }

    role(name: string): Role {
        return this._roles.find(r => r.serviceIndex > 0 && r.name === name)
    }

    async setRole(service: JDService, name: string) {
        const { device, serviceIndex } = service
        const { deviceId } = device
        //console.debug(`set role ${deviceId}:${serviceIndex} to ${role}`)

        const previous = name && this._roles.find(r => r.name === name)
        if (
            previous &&
            previous.deviceId === deviceId &&
            previous.serviceIndex === serviceIndex
        ) {
            // nothing todo
            console.debug(`role unmodified, skipping`)
            return
        }

        // set new role assignment
        {
            const data = jdpack<[Uint8Array, number, string]>("b[8] u8 s", [
                fromHex(deviceId),
                serviceIndex,
                name || "",
            ])
            await this.service.sendPacketAsync(
                Packet.from(RoleManagerCmd.SetRole, data),
                true
            )
        }

        // clear previous role assignment
        if (previous) {
            console.debug(
                `clear role ${previous.deviceId}:${previous.serviceIndex}`
            )
            const data = jdpack<[Uint8Array, number, string]>("b[8] u8 s", [
                fromHex(previous.deviceId),
                previous.serviceIndex,
                "",
            ])
            await this.service.sendPacketAsync(
                Packet.from(RoleManagerCmd.SetRole, data),
                true
            )
        }
    }

    startSimulators() {
        if (!this._roles?.length) return

        // collect roles that need to be bound
        const todos = groupBy(
            this._roles
                .filter(role => !this.bus.device(role.deviceId, true))
                .map(role => ({
                    role,
                    hostDefinition: serviceProviderDefinitionFromServiceClass(
                        role.serviceClass
                    ),
                }))
                .filter(todo => !!todo.hostDefinition),
            todo => parentName(todo.role.name) || ""
        )

        // spawn devices with group of devices
        Object.keys(todos).forEach(parent => {
            const todo = todos[parent]
            // no parent, spawn individual services
            if (!parent) {
                todo.forEach(t =>
                    addServiceProvider(this.bus, t.hostDefinition)
                )
            } else {
                // spawn all services into 1
                addServiceProvider(this.bus, {
                    name: "",
                    serviceClasses: [],
                    services: () =>
                        arrayConcatMany(
                            todo.map(t => t.hostDefinition.services())
                        ),
                })
            }
        })

        function parentName(role: string) {
            return role.split("/", 1)[0]
        }
    }
}

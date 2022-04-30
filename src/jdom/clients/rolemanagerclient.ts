import {
    addServiceProvider,
    serviceProviderDefinitionFromServiceClass,
    ServiceProviderOptions,
} from "../../servers/servers"
import { JDBus } from "../bus"
import {
    CHANGE,
    DEVICE_ANNOUNCE,
    ERROR,
    EVENT,
    RoleManagerCmd,
    ROLE_MANAGER_POLL,
    ROLE_QUERY_DEVICE,
    ROLE_QUERY_SELF_DEVICE,
    ROLE_QUERY_SERVICE_INDEX,
    ROLE_QUERY_SERVICE_OFFSET,
    SELF_ANNOUNCE,
    SystemEvent,
} from "../constants"
import { jdpack, jdunpack, PackedSimpleValue } from "../pack"
import { Packet } from "../packet"
import { InPipeReader } from "../pipes"
import { JDService } from "../service"
import { JDServiceClient } from "../serviceclient"
import {
    isConstRegister,
    isInfrastructure,
    serviceSpecificationFromClassIdentifier,
} from "../spec"
import {
    arrayConcatMany,
    debounceAsync,
    fromHex,
    groupBy,
    JSONTryParse,
    toHex,
    toMap,
} from "../utils"

/**
 * A service role assigment
 * @category Clients
 */
export interface Role {
    /**
     * Identifier of the bound device
     */
    deviceId: string
    /**
     * Service class bound, for sanity check
     */
    serviceClass: number
    /**
     * Service index bound
     */
    serviceIndex: number
    /**
     * Role name
     */
    name: string
    /**
     * Query argument (optional)
     */
    query?: string
}

function parentName(bus: JDBus, role: Role) {
    if (role.query) {
        const args = role.query.split("&").map(a => a.split("=", 2))
        const deviceId = args.find(a => a[0] === ROLE_QUERY_DEVICE)?.[1]
        if (deviceId === ROLE_QUERY_SELF_DEVICE) return bus.selfDeviceId
        return deviceId
    }
    return role.name.split("/", 1)[0]
}

function parseRole(role: Role): ServiceProviderOptions {
    const specification = serviceSpecificationFromClassIdentifier(
        role.serviceClass
    )
    if (!specification) return undefined
    const args = role.query
        ?.split("&")
        .map(a => a.split("=", 2))
        .filter(([n, v]) => n && v !== undefined)
        .map(([n, v]) => ({ name: n.toLowerCase().trim(), value: v }))
    const serviceOffset = args
        ?.filter(arg => arg.name === ROLE_QUERY_SERVICE_OFFSET)
        .map(arg => {
            const i = parseInt(arg.value)
            return isNaN(i) ? undefined : i
        })[0]
    const serviceIndex = args
        ?.filter(arg => arg.name === ROLE_QUERY_SERVICE_INDEX)
        .map(arg => {
            const i = parseInt(arg.value)
            return isNaN(i) ? undefined : i
        })[0]
    const pktArgs = args
        ?.map(({ name, value }) => ({
            name,
            value,
            pkt: specification.packets.find(
                pkt => isConstRegister(pkt) && pkt.name === name
            ),
        }))
        .filter(a => !!a.pkt?.packFormat)
        .map(({ name, value, pkt }) => {
            let simpleValue: PackedSimpleValue
            const type = pkt.fields[0].type
            const enumType: jdspec.EnumInfo = specification.enums?.[type]
            if (enumType)
                simpleValue = enumType.members[value] || parseInt(value)
            else if (type == "string") simpleValue = value
            else simpleValue = parseInt(value)
            return { name, value: simpleValue }
        })
    if (
        serviceOffset === undefined &&
        serviceIndex === undefined &&
        !pktArgs?.length
    )
        return undefined

    const constants: Record<string, PackedSimpleValue> = toMap(
        args,
        a => a.name,
        a => a.value
    )
    const r = {
        serviceClass: role.serviceClass,
        serviceOffset,
        serviceIndex,
        constants,
    }
    console.debug(`role: ${role.name}`, r)
    return r
}

/**
 * A client for the role manager service
 * @category Clients
 */
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
        )
            this.startRefreshRoles()
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
        this.log(`collecting roles`)
        this._lastRefreshAttempt = this.bus.timestamp
        const previousRolesHash = JSON.stringify(this._roles)
        try {
            const inp = new InPipeReader(this.bus)
            await this.service.sendPacketAsync(
                inp.openCommand(RoleManagerCmd.ListRoles),
                true
            )
            // collect all roles
            const roles: Role[] = []
            for (const buf of await inp.readData(1500)) {
                const [devidbuf, serviceClass, serviceIndex, full] = jdunpack<
                    [Uint8Array, number, number, string]
                >(buf, "b[8] u32 u8 s")
                const deviceId = toHex(devidbuf)
                const [name, query] = full.split("?", 2)
                const role: Role = {
                    deviceId,
                    serviceClass,
                    serviceIndex,
                    name,
                    query,
                }
                roles.push(role)
            }
            // store result if changed
            if (JSON.stringify(roles) !== previousRolesHash) {
                this.log(`roles updated`, roles)
                this._roles = roles
                this.emit(CHANGE)
            }
        } catch (e) {
            this.log(`collect roles failed`)
            this._needRefresh = true
            this.emit(ERROR, e)
        }
    }

    private assignRoles() {
        this.bus
            .services()
            .filter(srv => !isInfrastructure(srv.specification))
            .forEach(srv => this.assignRole(srv))
    }

    private assignRole(service: JDService) {
        const deviceId = service.device.deviceId
        const serviceIndex = service.serviceIndex
        const role = this._roles.find(
            r => r.deviceId === deviceId && r.serviceIndex === serviceIndex
        )
        if (service.role !== role?.name)
            this.log(`role ${service} -> ${role?.name || ""}`, { role })
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
            this.log(`role unmodified, skipping`)
            return
        }

        // set new role assignment
        {
            this.log(`assign role ${deviceId}[${serviceIndex}] -> ${name}`)
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
        if (previous && previous.deviceId != "0000000000000000") {
            this.log(`clear role ${previous.deviceId}:${previous.serviceIndex}`)
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

    allRolesBound() {
        return this._roles.every(role => !!this.bus.device(role.deviceId, true))
    }

    startSimulators() {
        this.log(`start role sims`, { roles: this._roles })
        const roles = this._roles.filter(
            role => !this.bus.device(role.deviceId, true)
        )
        if (!roles?.length) return

        this.log(`unbound roles: ${roles.length}`, { roles })
        // collect roles that need to be bound
        const todos = groupBy(
            roles
                .map(role => ({
                    role,
                    hostDefinition: serviceProviderDefinitionFromServiceClass(
                        role.serviceClass
                    ),
                }))
                .filter(todo => !!todo.hostDefinition),
            todo => parentName(this.bus, todo.role) || ""
        )
        this.log(`simulateable roles`, todos)

        // spawn devices with group of devices
        const parents = Object.keys(todos)
        parents.forEach(parent => {
            const todo = todos[parent]
            // no parent, spawn individual services
            if (!parent) {
                todo.forEach(t => {
                    const serviceOptions = parseRole(t.role)
                    addServiceProvider(
                        this.bus,
                        t.hostDefinition,
                        serviceOptions ? [serviceOptions] : undefined
                    )
                })
            } else {
                // spawn all services into 1
                addServiceProvider(
                    this.bus,
                    {
                        name: "",
                        serviceClasses: [],
                        services: () =>
                            arrayConcatMany(
                                todo.map(t => t.hostDefinition.services())
                            ),
                    },
                    todo.map(t => parseRole(t.role)).filter(q => !!q)
                )
            }
        })
    }
}

import { assert, SMap } from "../jdom/utils"
import { JDService } from "../jdom/service"
import { JDEventSource } from "../jdom/eventsource"
import { PackedValues } from "../jdom/pack"
import { serviceSpecificationFromClassIdentifier } from "../jdom/spec"
import { RoleRegister, RoleEvent } from "./compile"
import { VMEnvironmentInterface } from "./runner"
import { VMRole } from "./ir"
import { VMServiceServer, VM_EXTERNAL_REQUEST } from "./server"
import { VMServiceClient } from "./client"
import { atomic } from "./utils"

export const GLOBAL_CHANGE = "vmEnvGlobalChange"
export const REGISTER_CHANGE = "vmEnvRegisterChange"
export const EXTERNAL_REQUEST = "vmEnvEventChange"

export interface ExternalRequest {
    kind: "event" | "get" | "set" | "cmd"
    role: string
    tgt: string
}

export enum VMExceptionCode {
    RoleNoService = "vmEnvRoleNoService",
    TypeMismatch = "vmEnvTypeMismatch",
    InternalError = "vmInternalError",
}

export class VMException extends Error {
    constructor(readonly code: VMExceptionCode, readonly data: string) {
        super()
    }
}

export interface GlobalVariable {
    type: "number" | "boolean" | "string"
    value: atomic
}

export class VMEnvironment
    extends JDEventSource
    implements VMEnvironmentInterface
{
    private _currentRequest: ExternalRequest = undefined
    private _clientEnvs: SMap<VMServiceClient> = {}
    private _serverEnvs: SMap<VMServiceServer> = {}
    private _globals: SMap<GlobalVariable> = {}

    constructor(
        private registers: RoleRegister[],
        private events: RoleEvent[],
        private serverRoles: VMRole[]
    ) {
        super()
        this.setupServers()
    }

    private setupServers() {
        this.serverRoles.forEach(p => {
            // get the service
            const service = serviceSpecificationFromClassIdentifier(
                p.serviceClass
            )
            if (service) {
                // spin up JDServiceServer
                const serviceServer = new VMServiceServer(p.role, service)
                this._serverEnvs[p.role] = serviceServer
                serviceServer.subscribe(
                    VM_EXTERNAL_REQUEST,
                    (p: ExternalRequest) => {
                        this._currentRequest = p
                        this.emit(EXTERNAL_REQUEST, p)
                    }
                )
            }
        })
    }

    public globals() {
        return this._globals
    }

    public servers() {
        return Object.keys(this._serverEnvs).map(k => {
            return {
                role: k,
                serviceClass: this._serverEnvs[k].serviceClass,
                server: this._serverEnvs[k],
            }
        })
    }

    public serviceChanged(role: string, service: JDService) {
        if (this._clientEnvs[role]) {
            this._clientEnvs[role].unmount()
            this._clientEnvs[role] = undefined
        }
        if (!service) this._rolesUnbound.push(role)
        else {
            this._rolesBound.push(role)
            this._clientEnvs[role] = new VMServiceClient(service)
            this.registers.forEach(r => {
                if (r.role === role) {
                    this.registerRegister(role, r.register)
                }
            })
            this.events.forEach(e => {
                if (e.role === role) {
                    this.registerEvent(role, e.event)
                }
            })
        }
    }

    public roleBound(role: string) {
        return !!this._clientEnvs[role]
    }

    public registerRegister(role: string, reg: string) {
        const serviceEnv = this.getService(role)
        serviceEnv.registerRegister(reg, () => {
            this.emit(REGISTER_CHANGE, reg)
        })
    }

    public registerEvent(role: string, tgt: string) {
        const serviceEnv = this.getService(role)
        serviceEnv.registerEvent(tgt, () => {
            this._currentRequest = { kind: "event", role, tgt }
            this.emit(EXTERNAL_REQUEST, this._currentRequest)
        })
    }

    private getRootName(e: jsep.MemberExpression | string) {
        if (!e) return undefined
        if (typeof e === "string") return e
        if (e.type === "MemberExpression")
            return (e.object as jsep.Identifier).name
        return undefined
    }

    private getService(e: jsep.MemberExpression | string) {
        const root = this.getRootName(e)
        if (!root) return undefined
        const s = this._clientEnvs[root]
        return s
    }

    private getServer(e: jsep.MemberExpression | string) {
        const root = this.getRootName(e)
        if (!root) return undefined
        const s = this._serverEnvs[root]
        return s
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async sendCommandAsync(
        e: jsep.MemberExpression,
        values: PackedValues
    ) {
        const serviceEnv = this.getService(e)
        if (serviceEnv) {
            await serviceEnv?.sendCommandAsync(
                (e.property as jsep.Identifier).name,
                values
            )
        } else {
            const server = this.getServer(e)
            await server?.sendEventNameAsync(
                (e.property as jsep.Identifier).name,
                values
            )
        }
    }

    public async lookupAsync(e: jsep.MemberExpression | string) {
        const roleName = this.getRootName(e)
        if (roleName.startsWith("$var")) {
            const me = e as jsep.MemberExpression
            if (me.property.type === "Identifier") {
                const local = (me.property as jsep.Identifier).name
                return this._globals[local]?.value
            }
            return undefined
        }
        const ep = (e as jsep.MemberExpression).property as
            | jsep.Identifier
            | jsep.MemberExpression
        const root =
            typeof ep === "string"
                ? ep
                : ep.type === "Identifier"
                ? ep.name
                : (ep.object as jsep.Identifier).name
        const fld =
            typeof ep === "string"
                ? undefined
                : ep.type === "Identifier"
                ? undefined
                : (ep.property as jsep.Identifier).name
        const serviceEnv = this.getService(e)
        if (serviceEnv) return await serviceEnv.lookupRegisterAsync(root, fld)
        else {
            const server = this.getServer(e)
            return server.lookupRegister(root, fld)
        }
    }

    public async writeRegisterAsync(
        e: jsep.MemberExpression | string,
        values: atomic[]
    ) {
        const serviceEnv = this.getService(e)
        const me = e as jsep.MemberExpression
        if (me.property.type === "Identifier") {
            const reg = (me.property as jsep.Identifier).name
            if (serviceEnv) await serviceEnv.writeRegisterAsync(reg, values)
            else {
                const server = this.getServer(e)
                return server.writeRegister(reg, values)
            }
        }
    }

    public writeGlobal(
        e: jsep.MemberExpression | string,
        value: string | boolean | number
    ) {
        const roleName = this.getRootName(e)
        if (!roleName || !roleName.startsWith("$var")) return undefined
        const me = e as jsep.MemberExpression
        if (me.property.type === "Identifier") {
            const local = (me.property as jsep.Identifier).name
            if (this._globals[local]) {
                const firstType = this._globals[local].type
                if (firstType !== typeof value) {
                    throw new VMException(
                        VMExceptionCode.TypeMismatch,
                        `variable ${local} has first type ${firstType}; trying to assign ${value.toString()}`
                    )
                }
                if (value !== this._globals[local].value) {
                    this._globals[local].value = value
                    this.emit(GLOBAL_CHANGE)
                }
            } else {
                const firstType = typeof value
                if (
                    firstType !== "string" &&
                    firstType !== "boolean" &&
                    firstType !== "number"
                ) {
                    throw new VMException(
                        VMExceptionCode.TypeMismatch,
                        `Value of type ${firstType} not supported`
                    )
                }
                this._globals[local] = { type: firstType, value }
                this.emit(GLOBAL_CHANGE)
            }
            return true
        }
        return false
    }

    public clearExternalStimulii() {
        this._currentRequest = undefined
        this.rolesReset()
    }

    public hasRequest(e: jsep.MemberExpression | string): ExternalRequest {
        const roleName = this.getRootName(e)
        const me = e as jsep.MemberExpression
        if (me.property.type === "Identifier") {
            const op = (me.property as jsep.Identifier).name
            if (
                this._currentRequest?.role === roleName &&
                this._currentRequest?.tgt === op
            )
                return this._currentRequest
        }
        return undefined
    }

    public async completeRequest(request: ExternalRequest) {
        assert(request.kind === "get")
        const server = this.getServer(request.role)
        await server.respondToGetRegisterEvent(request.tgt)
    }

    // role events
    private _rolesBound: string[] = []
    private _rolesUnbound: string[] = []
    private rolesReset() {
        this._rolesBound = []
        this._rolesUnbound = []
    }
    public initRoles() {
        this._rolesBound = Object.keys(this._clientEnvs).slice(0)
    }
    public roleTransition(role: string, event: string): boolean {
        if (event === "bound") {
            return !!this._rolesBound.find(r => role === "any" || r === role)
        } else {
            return !!this._rolesUnbound.find(r => role === "any" || r === role)
        }
    }

    public unsubscribe() {
        for (const vs of Object.values(this._clientEnvs)) {
            vs.unmount()
        }
    }
}

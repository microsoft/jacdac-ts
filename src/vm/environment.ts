import { isEvent, isRegister, isCommand, isIntensity } from "../jdom/spec"
import { JDEvent } from "../jdom/event"
import { JDServiceClient } from "../jdom/serviceclient"
import { JDRegister } from "../jdom/register"
import { SMap } from "../jdom/utils"
import { JDService } from "../jdom/service"
import { JDEventSource } from "../jdom/eventsource"
import { CHANGE, EVENT, SystemReg } from "../jdom/constants"
import { jdpack, PackedValues } from "../jdom/pack"

import { RoleRegister, RoleEvent } from "./compile"
import { VMEnvironmentInterface, atomic } from "./runner"

export const GLOBAL_CHANGE = "vmEnvGlobalChange"
export const REGISTER_CHANGE = "vmEnvRegisterChange"
export const EVENT_CHANGE = "vmEnvEventChange"

export enum VMExceptionCode {
    RoleNoService = "vmEnvRoleNoService",
    TypeMismatch = "vmEnvTypeMismatch",
    InternalError = "vmInternalError"
}

export class VMException extends Error {
    constructor(readonly code: VMExceptionCode, readonly data: string) {
        super()
    }
}

export class VMServiceEnvironment extends JDServiceClient {
    private _registers: SMap<JDRegister> = {}
    private _events: SMap<JDEvent> = {}

    constructor(service: JDService) {
        super(service)
    }

    public registerRegister(regName: string, handler: () => void) {
        if (!this._registers[regName]) {
            const pkt = this.service.specification.packets.find(
                pkt => isRegister(pkt) && pkt.name === regName
            )
            if (pkt) {
                const register = this.service.register(pkt.identifier)
                this._registers[regName] = register
                this.mount(register.subscribe(CHANGE, handler))
            }
        }
    }

    public registerEvent(eventName: string, handler: () => void) {
        if (!this._events[eventName]) {
            const pkt = this.service.specification.packets.find(
                pkt => isEvent(pkt) && pkt.name === eventName
            )
            if (pkt) {
                const event = this.service.event(pkt.identifier)
                this._events[eventName] = event
                this.mount(event.subscribe(EVENT, handler))
            }
        }
    }

    public async sendCommandAsync(
        command: jsep.Identifier,
        values: PackedValues
    ) {
        const commandName = command?.name
        const pkt = this.service.specification.packets.find(
            p => isCommand(p) && p.name === commandName
        )
        if (pkt) {
            await this.service.sendCmdAsync(
                pkt.identifier,
                jdpack(pkt.packFormat, values),
                true
            )
        }
    }

    public async writeRegisterAsync(regName: string, ev: atomic) {
        const register = this._registers[regName]
        if (register.code === SystemReg.Value) await this.setEnabled()
        await this.writeRegAsync(this._registers[regName], ev)
    }

    private async writeRegAsync(jdreg: JDRegister, ev: atomic) {
        await jdreg?.sendSetPackedAsync(
            jdreg.specification?.packFormat,
            [ev],
            true
        )
    }

    private async setEnabled() {
        const pkt = this.service.specification.packets.find(isIntensity)
        if (pkt && pkt.fields[0].type === "bool") {
            const jdreg = this.service.register(SystemReg.Intensity)
            await this.writeRegAsync(jdreg, true)
        }
    }

    public async lookupRegisterAsync(e: jsep.MemberExpression | jsep.Identifier | string) {
        const root =
            typeof e === "string"
                ? e
                : e.type === "Identifier"
                ? e.name
                : (e.object as jsep.Identifier).name
        const fld =
            typeof e === "string"
                ? undefined
                : e.type === "Identifier"
                ? undefined
                : (e.property as jsep.Identifier).name
        if (root in this._registers) {
            const register = this._registers[root]
            await register.refresh()
            if (!fld) return register.unpackedValue?.[0]
            else {
                const field = register.fields.find(
                    f => f.name === fld
                )
                return field?.value
            }
        } else if (root in this._events) {
            const field = this._events[root].fields?.find(f => f.name === fld)
            return field?.value
        }
        return undefined
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
    private _currentEvent: string = undefined
    private _envs: SMap<VMServiceEnvironment> = {}
    private _globals: SMap<GlobalVariable> = {}

    constructor(
        private registers: RoleRegister[],
        private events: RoleEvent[]
    ) {
        super()
    }

    public globals() {
        return this._globals;
    }

    public serviceChanged(role: string, service: JDService) {
        if (this._envs[role]) {
            this._envs[role].unmount()
            this._envs[role] = undefined
            
        }
        if (!service) 
            this._rolesUnbound.push(role)
        else {
            this._rolesBound.push(role)
            this._envs[role] = new VMServiceEnvironment(service)
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
        return !!this._envs[role]
    }

    public registerRegister(role: string, reg: string) {
        try {
            const serviceEnv = this.getService(role)
            serviceEnv.registerRegister(reg, () => {
                this.emit(REGISTER_CHANGE, reg)
            })
        } catch (e) {
            // nothing
        }
    }

    public registerEvent(role: string, ev: string) {
        try {
            const serviceEnv = this.getService(role)
            serviceEnv.registerEvent(ev, () => {
                this._currentEvent = `${role}.${ev}`
                this.emit(EVENT_CHANGE, this._currentEvent)
            })
        } catch (e) {
            // nothing
        }
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
        const s = this._envs[root]
        if (!s) {
            throw new VMException(
                VMExceptionCode.RoleNoService,
                root
            )
        }
        return s
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async sendCommandAsync(
        e: jsep.MemberExpression,
        values: PackedValues
    ) {
        const serviceEnv = this.getService(e)
        // TODO: need to raise alert if service undefined
        await serviceEnv?.sendCommandAsync(
            e.property as jsep.Identifier,
            values
        )
    }

    public async lookupAsync(
        e: jsep.MemberExpression | string
    ) {
        const roleName = this.getRootName(e)
        if (roleName.startsWith("$var")) {
            const me = e as jsep.MemberExpression
            if (me.property.type === "Identifier") {
                const local = (me.property as jsep.Identifier).name
                return this._globals[local]?.value
            }
            return undefined
        }
        const serviceEnv = this.getService(e)
        const me = e as jsep.MemberExpression
        return await serviceEnv.lookupRegisterAsync(
            me.property as jsep.Identifier | jsep.MemberExpression
        )
    }

    public async writeRegisterAsync(
        e: jsep.MemberExpression | string,
        ev: number
    ) {
        const serviceEnv = this.getService(e)
        const me = e as jsep.MemberExpression
        if (me.property.type === "Identifier") {
            const reg = (me.property as jsep.Identifier).name
            await serviceEnv.writeRegisterAsync(reg, ev)
        }
    }

    public writeGlobal(
        e: jsep.MemberExpression | string,
        value: string | boolean | number
    ) {
        const roleName = this.getRootName(e)
        if (!roleName || roleName !== "$") return undefined
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

    public clearEvents() {
        this._currentEvent = undefined
        this.rolesReset()
    }

    public hasEvent(e: jsep.MemberExpression | string) {
        const roleName = this.getRootName(e)
        const me = e as jsep.MemberExpression
        if (me.property.type === "Identifier") {
            const event = (me.property as jsep.Identifier).name
            return this._currentEvent === `${roleName}.${event}`
        }
        return false
    }
    
    // role events
    private _rolesBound: string[] = []
    private _rolesUnbound: string[] = []
    private rolesReset() {
        this._rolesBound = []
        this._rolesUnbound = []
    }
    public initRoles() {
        this._rolesBound = Object.keys(this._envs).slice(0)
    }
    public roleTransition(role: string, event: string): boolean {
        if (event === "bound") {
            return !!this._rolesBound.find(r => role === "any" || r === role)
        } else {
            return !!this._rolesUnbound.find(r => role === "any" || r === role)
        }
    }

    public unsubscribe() {
        for (const vs of Object.values(this._envs)) {
            vs.unmount()
        }
    }
}

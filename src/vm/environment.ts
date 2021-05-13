import {
    isEvent,
    isRegister
} from "../jdom/spec"
import { JDEvent } from "../jdom/event"
import { JDServiceClient } from "../jdom/serviceclient"
import { JDRegister } from "../jdom/register"
import { SMap } from "../jdom/utils"
import { JDService } from "../jdom/service"
import { 
    CHANGE, 
    EVENT, 
    ROLE_MANAGER_CHANGE, 
    ROLE_CHANGE 
} from "../jdom/constants"

export async function refresh_env(registers: SMap<JDRegister>) {
    for (const k in registers) {
        const register = registers[k]
        let retry = 0
        let val: any = undefined
        do {
            await register.refresh()
            val = register.unpackedValue?.[0]
        } while (val === undefined && retry++ < 2)
    }
}

export class VMServiceEnvironment extends JDServiceClient {
    private _registers: SMap<JDRegister> = {}
    private _events: SMap<JDEvent> = {}

    constructor(service: JDService) {
        super(service)
    }

    public registerRegister(regName: string, handler: () => void ) {
        if (!this._registers[regName]) {
            const pkt = this.service.specification.packets.find(
                pkt => isRegister(pkt) && pkt.name === regName
            )
            if (pkt) {
                const register = this.service.register(pkt.identifier)
                this._registers[regName] = register
                this.mount(
                    register.subscribe(CHANGE, handler )
                )
            }
        }
    }

    public registerEvent(eventName: string, handler: () => void ) {
        if (!this._events[eventName]) {
            const pkt = this.service.specification.packets.find(
                pkt => isEvent(pkt) && pkt.name === eventName
            )
            if (pkt) {
                const event = this.service.event(pkt.identifier)
                this._events[eventName] = event
                this.mount(
                    event.subscribe(EVENT, handler )
                )
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public writeRegister(regName: string, ev: any) {
        const jdreg = this._registers[ regName] 
        if (jdreg) {
            const fmt = jdreg.specification?.packFormat
            jdreg.sendSetPackedAsync(fmt, [ev])
            return true
        }
        return false
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public lookup(e: jsep.MemberExpression | jsep.Identifier | string): any {
        let root = typeof(e) === "string" ? e : (e.type === "Identifier" ? e.name : (e.object as jsep.Identifier).name)
        let fld = typeof(e) === "string" ? undefined : (e.type === "Identifier" ? undefined : (e.property as jsep.Identifier).name)
        if (root in this._registers) {
            if (!fld) return this._registers[root].unpackedValue?.[0]
            else {
                const field = this._registers[root].fields.find(
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
    
    public refreshEnvironment() {
        refresh_env(this._registers)
    }
}


export class VMRoleManagerEnvironment extends JDServiceClient{
    private _currentEvent: string = undefined
    private _roles: SMap<VMServiceEnvironment> = {}
    private _locals: SMap<string> = {}

    constructor(service: JDService, private readonly notifyOnChange: () => void) {
        super(service)
        this.subscribe(ROLE_MANAGER_CHANGE, () => { 
            Object.values(this._roles).forEach(r => r.unmount())
            this._roles = {}
        })
        this.subscribe(ROLE_CHANGE, () => { 
            Object.values(this._roles).forEach(r => r.unmount())
            this._roles = {}
        })
    }

    private getRoleName(e: jsep.MemberExpression | string) {
        if (!e || typeof(e) === "string" || e.type !== "MemberExpression")
            return undefined
        return (e.object as jsep.Identifier).name
    }

    private getService(e: jsep.MemberExpression | string) {
        const roleName = this.getRoleName(e)
        if (!roleName)
            return undefined;
        if (!this._roles[roleName]) {
            const rm = this.bus.roleManager
            const role = rm?.roles.find(r => r.name === roleName)
            if (role) {
                const device = this.bus.device(role.deviceId)
                const service = device.service(role.serviceIndex)
                this._roles[roleName] = new VMServiceEnvironment(service)
            } else  
                return undefined
        }
        return this._roles[roleName]
    }

    public refreshEnvironment() {
        Object.values(this._roles).forEach(s => s.refreshEnvironment())
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public lookup(e: jsep.MemberExpression | string): any {
        const roleName = this.getRoleName(e)
        if (roleName === "$") {
            let me = e as jsep.MemberExpression
            if (me.property.type === "Identifier") {
                const local = (me.property as jsep.Identifier).name
                return this._locals[local]
            }
            return undefined;
        }
        const serviceEnv = this.getService(e)
        if (!serviceEnv)
            return undefined
        const me = e as jsep.MemberExpression
        if (serviceEnv && me.property.type === "Identifier") {
            const reg = (me.property as jsep.Identifier).name
            serviceEnv.registerRegister(reg, this.notifyOnChange);
            return serviceEnv.lookup(reg)
        }
        return undefined
    }

    public writeRegister(e: jsep.MemberExpression | string, ev: any) {
        const serviceEnv = this.getService(e)
        const me = e as jsep.MemberExpression;
        if (serviceEnv && me.property.type === "Identifier") {
            const reg = (me.property as jsep.Identifier).name
            serviceEnv.registerRegister(reg, this.notifyOnChange);
            return serviceEnv.writeRegister(reg, ev);
        }
        return false
    }

    public writeLocal(e: jsep.MemberExpression | string, ev: any) {
        const roleName = this.getRoleName(e)
        if (!roleName || roleName !== "$")
            return undefined;
            const me = e as jsep.MemberExpression;
        if (me.property.type === "Identifier") {
            const local = (me.property as jsep.Identifier).name
            this._locals[local] = ev
            return true
        }
        return false;
    }

    public consumeEvent() {
        this._currentEvent = undefined
    }

    public hasEvent(e: jsep.MemberExpression | string) {
        const serviceEnv = this.getService(e)
        if (!serviceEnv)
            return false
            const me = e as jsep.MemberExpression;
        if (serviceEnv && me.property.type === "Identifier") {
            const event = (me.property as jsep.Identifier).name
            serviceEnv.registerEvent(event, () => {
                this._currentEvent = event
            });
            return this._currentEvent === event
        }
        return false
    }
}
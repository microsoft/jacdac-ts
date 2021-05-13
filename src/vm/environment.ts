import {
    isEvent,
    isRegister
} from "../jdom/spec"
import { JDEvent } from "../jdom/event"
import { JDServiceClient } from "../jdom/serviceclient"
import { JDRegister } from "../jdom/register"
import { SMap } from "../jdom/utils"
import { JDBus } from "../jdom/bus"
import { JDService } from "../jdom/service"
import { JDEventSource } from "../jdom/eventsource"
import { 
    CHANGE, 
    EVENT,
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


export class VMEnvironment extends JDEventSource  {
    private _currentEvent: string = undefined
    private _roles: SMap<VMServiceEnvironment> = {}
    private _locals: SMap<string> = {}

    constructor(private readonly bus: JDBus, private readonly notifyOnChange: () => void) {
        super()
        this.subscribe(CHANGE, () => { 

        })
    }

    private getRootName(e: jsep.MemberExpression | string) {
        if (!e || typeof(e) === "string" || e.type !== "MemberExpression")
            return undefined
        return (e.object as jsep.Identifier).name
    }

    private nameMatch(n1: string, n2: string) {
        const cn1 = n1.slice(0).toLowerCase().replace("_"," ").trim()
        const cn2 = n2.slice(0).toLowerCase().replace("_"," ").trim()
        return cn1 === cn2
    }
    
    private getServiceFromName(root: string): JDService {
        // policy for resolution goes here
        return this.bus.services().find(s => this.nameMatch(s.specification.shortName, root))
    }

    private getService(e: jsep.MemberExpression | string) {
        const root = this.getRootName(e)
        if (!root)
            return undefined;
        if (!this._roles[root]) {
            const service = this.getServiceFromName(root);
            if (service) {
                this._roles[root] = new VMServiceEnvironment(service)
            } else  
                return undefined
        }
        return this._roles[root]
    }

    public refreshEnvironment() {
        Object.values(this._roles).forEach(s => s.refreshEnvironment())
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public lookup(e: jsep.MemberExpression | string): any {
        const roleName = this.getRootName(e)
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

    // TODO: need do a notify
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
        const roleName = this.getRootName(e)
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
        console.log("hasEvent", e)
        const serviceEnv = this.getService(e)
        if (!serviceEnv)
            return false
        const me = e as jsep.MemberExpression;
        if (serviceEnv && me.property.type === "Identifier") {
            const event = (me.property as jsep.Identifier).name
            serviceEnv.registerEvent(event, () => {
                this._currentEvent = event
                this.notifyOnChange()
            });
            return this._currentEvent === event
        }
        return false
    }
}
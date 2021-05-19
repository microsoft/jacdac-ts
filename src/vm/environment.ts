import { isEvent, isRegister } from "../jdom/spec"
import { JDEvent } from "../jdom/event"
import { JDServiceClient } from "../jdom/serviceclient"
import { JDRegister } from "../jdom/register"
import { SMap } from "../jdom/utils"
import { JDBus } from "../jdom/bus"
import { JDService } from "../jdom/service"
import { JDDevice } from "../jdom/device"
import { serviceSpecificationFromName } from "../jdom/spec"
import { JDEventSource } from "../jdom/eventsource"
import { CHANGE, EVENT, DEVICE_CHANGE, DEVICE_LOST } from "../jdom/constants"
import {
    addServiceProvider,
    serviceProviderDefinitionFromServiceClass,
} from "../../src/servers/servers"

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

// TODO: you want [ev] to be PackedValues and handle the arrays yourself.
async function writeReg(reg: JDRegister, fmt: string, ev: any) {
    await reg.sendSetPackedAsync(fmt, [ev], true)
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public writeRegister(regName: string, ev: any) {
        const jdreg = this._registers[regName]
        if (jdreg) {
            writeReg(jdreg, jdreg.specification?.packFormat, ev)
            return true
        }
        return false
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public lookup(e: jsep.MemberExpression | jsep.Identifier | string): any {
        let root =
            typeof e === "string"
                ? e
                : e.type === "Identifier"
                ? e.name
                : (e.object as jsep.Identifier).name
        let fld =
            typeof e === "string"
                ? undefined
                : e.type === "Identifier"
                ? undefined
                : (e.property as jsep.Identifier).name
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

export class MyRoleManager extends JDEventSource {
    private _roles: SMap<JDService | string> = {}
    private _devices: JDDevice[] = []

    constructor(
        private readonly bus: JDBus,
    ) {
        super()
        this.bus.on(DEVICE_CHANGE, (dev: JDDevice) => {
            dev.services().forEach(s => {
                Object.keys(this._roles).forEach(key => {
                    if (typeof(this._roles[key]) === "string" && 
                        this.nameMatch(this._roles[key] as string, s.specification.shortName)) {
                        this._roles[key] = s
                        if (this._devices.indexOf(dev) === -1)
                            this._devices.push(dev)
                    }
                })
            })
        })
        this.bus.on(DEVICE_LOST, (dev: JDDevice) => {
            if (this._devices.indexOf(dev) >= 0) {
                this._devices = this._devices.filter(d => d !== dev)
                Object.keys(this._roles).forEach(key => {
                    if (typeof(this._roles[key]) !== "string" &&
                        dev.services().indexOf(this._roles[key] as JDService) >= 0) {
                        this._roles[key] = (this._roles[key] as JDService).specification.shortName
                    }
                })
            }
        })
    }
    
    public getService(role: string): JDService {
        let s = this._roles[role] 
        return (!s || typeof s === "string") ? undefined : s
    }

    private nameMatch(n1: string, n2: string) {
        const cn1 = n1.slice(0).toLowerCase().replace("_", " ").trim()
        const cn2 = n2.slice(0).toLowerCase().replace("_", " ").trim()
        return cn1 === cn2
    }
    
    private getServiceFromName(root: string): JDService[] {
        return this.bus
            .services()
            .filter(s => this.nameMatch(s.specification.shortName, root))
    }

    public addRoleService(role: string, serviceShortName: string) {
        if (this._roles[role])
            return
        let existingInstance = Object.values(this._roles).findIndex(r =>
                typeof r === "string" && this.nameMatch(r,serviceShortName) ||
                typeof r === "object" && this.nameMatch(r.specification.shortName, serviceShortName)
        )
        this._roles[role] = serviceShortName
        let ret = this.getServiceFromName(serviceShortName)
        if (existingInstance || ret.length === 0) {
            // spin up a new simulator
            let service = serviceSpecificationFromName(serviceShortName)
            let provider = serviceProviderDefinitionFromServiceClass(service.classIdentifier)
            addServiceProvider(this.bus, provider)
        } else {
            this._roles[role] = ret[0]
        }
    }
}

export class VMEnvironment extends JDEventSource {
    private _currentEvent: string = undefined
    private _envs: SMap<VMServiceEnvironment> = {}
    private _locals: SMap<string> = {}

    constructor(
        private readonly roleManager: MyRoleManager,
        private readonly notifyOnChange: () => void
    ) {
        super()
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
        if (!this._envs[root]) {
            const service = this.roleManager.getService(root)
            if (service) {
                this._envs[root] = new VMServiceEnvironment(service)
            } else 
                return undefined
        } else {
            const service = this.roleManager.getService(root)
            if (!service || service != this._envs[root].service) {
                this._envs[root].unmount()
                this._envs[root] = new VMServiceEnvironment(service)
            }
        }
        return this._envs[root]
    }

    public refreshEnvironment() {
        Object.values(this._envs).forEach(s => s.refreshEnvironment())
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
            return undefined
        }
        const serviceEnv = this.getService(e)
        if (!serviceEnv) return undefined
        const me = e as jsep.MemberExpression
        if (serviceEnv && me.property.type === "Identifier") {
            const reg = (me.property as jsep.Identifier).name
            serviceEnv.registerRegister(reg, this.notifyOnChange)
            return serviceEnv.lookup(reg)
        }
        return undefined
    }

    // TODO: need do a notify
    public writeRegister(e: jsep.MemberExpression | string, ev: any) {
        const serviceEnv = this.getService(e)
        const me = e as jsep.MemberExpression
        if (serviceEnv && me.property.type === "Identifier") {
            const reg = (me.property as jsep.Identifier).name
            serviceEnv.registerRegister(reg, this.notifyOnChange)
            return serviceEnv.writeRegister(reg, ev)
        }
        return false
    }

    public writeLocal(e: jsep.MemberExpression | string, ev: any) {
        const roleName = this.getRootName(e)
        if (!roleName || roleName !== "$") return undefined
        const me = e as jsep.MemberExpression
        if (me.property.type === "Identifier") {
            const local = (me.property as jsep.Identifier).name
            this._locals[local] = ev
            return true
        }
        return false
    }

    public consumeEvent() {
        this._currentEvent = undefined
    }

    public hasEvent(e: jsep.MemberExpression | string) {
        const serviceEnv = this.getService(e)
        if (!serviceEnv) return false
        const me = e as jsep.MemberExpression
        if (serviceEnv && me.property.type === "Identifier") {
            const event = (me.property as jsep.Identifier).name
            serviceEnv.registerEvent(event, () => {
                this._currentEvent = event
                this.notifyOnChange()
            })
            return this._currentEvent === event
        }
        return false
    }

    public unsubscribe() {
        Object.values(this._envs).forEach(vs => vs.unmount())
    }
}

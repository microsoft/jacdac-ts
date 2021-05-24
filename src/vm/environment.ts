import { isEvent, isRegister, isCommand } from "../jdom/spec"
import { JDEvent } from "../jdom/event"
import { JDServiceClient } from "../jdom/serviceclient"
import { JDRegister } from "../jdom/register"
import { SMap } from "../jdom/utils"
import { JDService } from "../jdom/service"
import { JDEventSource } from "../jdom/eventsource"
import { CHANGE, EVENT } from "../jdom/constants"
import { runInThisContext } from "vm"

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

    public sendCommand(command: jsep.Identifier, args: jsep.Expression[]) {
        const commandName = command?.name
        const pkt = this.service.specification.packets.find(
            pkt => isCommand(pkt) && pkt.name === commandName
        )
        if (pkt) {
            let fields = pkt.fields
            // TODO: pack up the arguments and send
            // this.service.sendCmdAsync
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

export class VMEnvironment extends JDEventSource {
    private _currentEvent: string = undefined
    private _envs: SMap<VMServiceEnvironment> = {}
    private _locals: SMap<string> = {}

    constructor(
        private readonly notifyOnChange: () => void
    ) {
        super()
    }

    public serviceChanged(role: string, service: JDService, added: boolean) {
        if (this._envs[role]) {
            this._envs[role].unmount()
            this._envs[role] = undefined
        }
        if (added) {
            this._envs[role] = new VMServiceEnvironment(service)
        }
    }

    public registerRegister(role: string, reg: string) {
        const serviceEnv = this.getService(role)
        if (serviceEnv) {
            serviceEnv.registerRegister(reg, this.notifyOnChange)
        }
    }

    public registerEvent(role: string, ev: string) {
        const serviceEnv = this.getService(role)
        if (serviceEnv) {
            serviceEnv.registerEvent(ev, () => {
                this._currentEvent = `${role}.${ev}`
                this.notifyOnChange()
            })
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
        return this._envs[root]
    }

    public refreshEnvironment() {
        Object.values(this._envs).forEach(s => s?.refreshEnvironment())
    }

    public sendCommand(e: jsep.CallExpression) {
        let callee = e.callee as jsep.MemberExpression
        const serviceEnv = this.getService(callee)
        if (serviceEnv) {
            serviceEnv.sendCommand(callee.property as jsep.Identifier, e.arguments)
        }
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
            return serviceEnv.lookup(reg)
        }
        return undefined
    }

    public writeRegister(e: jsep.MemberExpression | string, ev: any) {
        const serviceEnv = this.getService(e)
        const me = e as jsep.MemberExpression
        if (serviceEnv && me.property.type === "Identifier") {
            const reg = (me.property as jsep.Identifier).name
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
        const roleName = this.getRootName(e)
        const serviceEnv = this.getService(e)
        if (!serviceEnv) return false
        const me = e as jsep.MemberExpression
        if (me.property.type === "Identifier") {
            const event = (me.property as jsep.Identifier).name
            return this._currentEvent === `${roleName}.${event}`
        }
        return false
    }

    public unsubscribe() {
        Object.values(this._envs).forEach(vs => vs.unmount())
    }
}

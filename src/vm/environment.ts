import {
    isEvent,
    isRegister,
    serviceSpecificationFromClassIdentifier,
} from "../jdom/spec"
import { JDEvent } from "../jdom/event"
import { JDServiceClient } from "../jdom/serviceclient"
import { JDRegister } from "../jdom/register"
import { SMap } from "./expr"
import { JDService } from "../jdom/service"
import { CHANGE, EVENT } from "../jdom/constants"
import { RoleManagerClient } from "../jdom/rolemanagerclient"

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

export class VMEnvironment extends JDServiceClient {
    private _registers: SMap<JDRegister> = {}
    private _events: SMap<JDEvent> = {}
    private _serviceSpec: jdspec.ServiceSpec;

    constructor(service: JDService) {
        super(service)
        this._serviceSpec = serviceSpecificationFromClassIdentifier(
            service.serviceClass
        )
    }

    public registerRegister(regName: string, handler: () => void ) {
        if (!this._registers[regName]) {
            const pkt = this._serviceSpec.packets.find(
                pkt => isRegister(pkt) && pkt.name === regName
            )
            const register = this.service.register(pkt.identifier)
            this._registers[regName] = register
            this.mount(
                register.subscribe(CHANGE, handler )
            )
        }
    }

    public registerEvent(eventName: string, handler: () => void ) {
        if (!this._events[eventName]) {
            const pkt = this._serviceSpec.packets.find(
                pkt => isEvent(pkt) && pkt.name === eventName
            )
            const event = this.service.event(pkt.identifier)
            this._events[eventName] = event
            this.mount(
                event.subscribe(EVENT, handler )
            )
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
    public lookup(root: string, fld = ""): any {
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
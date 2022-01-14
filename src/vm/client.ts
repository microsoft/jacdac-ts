import { isEvent, isRegister, isCommand, isIntensity } from "../jdom/spec"
import { JDServiceClient } from "../jdom/serviceclient"
import { JDService } from "../jdom/service"
import { JDRegister } from "../jdom/register"
import { JDEvent } from "../jdom/event"
import { CHANGE, EVENT, REPORT_UPDATE, SystemReg } from "../jdom/constants"
import { SMap } from "../jdom/utils"
import { jdpack, PackedValues } from "../jdom/pack"
import { atomic } from "./utils"

export class VMServiceClient extends JDServiceClient {
    private _registers: SMap<JDRegister> = {}
    private _reportUpdate: SMap<boolean> = {}
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

    public async sendCommandAsync(commandName: string, values: PackedValues) {
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

    public async writeRegisterAsync(regName: string, values: atomic[]) {
        const register = this._registers[regName]
        if (register.code === SystemReg.Value) await this.setEnabled()
        await this.writeRegAsync(this._registers[regName], values)
    }

    private async writeRegAsync(jdreg: JDRegister, values: atomic[]) {
        await jdreg?.sendSetPackedAsync(values, true)
    }

    private async setEnabled() {
        const pkt = this.service.specification.packets.find(isIntensity)
        if (pkt && pkt.fields[0].type === "bool") {
            const jdreg = this.service.register(SystemReg.Intensity)
            await this.writeRegAsync(jdreg, [true])
        }
    }

    public async lookupRegisterAsync(
        root: string,
        fld: string,
        reportUpdate = false
    ) {
        if (root in this._registers) {
            const register = this._registers[root]
            if (reportUpdate && !this._reportUpdate[root]) {
                this._reportUpdate[root] = true
                this.mount(register.subscribe(REPORT_UPDATE, () => {}))
            }
            await register.refresh()
            if (!fld) return register.unpackedValue?.[0]
            else {
                const field = register.fields.find(f => f.name === fld)
                return field?.value
            }
        } else if (root in this._events) {
            const field = this._events[root].fields?.find(f => f.name === fld)
            return field?.value
        }
        return undefined
    }
}

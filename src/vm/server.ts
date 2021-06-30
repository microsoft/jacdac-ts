import JDServiceServer from "../jdom/serviceserver"
import {
    isHighLevelRegister,
    isHighLevelEvent,
    isCommand,
} from "../../../jacdac-ts/src/jdom/spec"
import { SMap } from "../jdom/utils"
import { jdpack, PackedValues } from "../jdom/pack"
import { atomic } from "./utils"
import { CHANGE } from "../jdom/constants"
import { Packet } from "../jdom/packet"

export const VM_SERVER_COMMAND_RECEIVED = "vmServerCommandReceived"
export const VM_SERVER_REGISTER_CHANGED = "vmServerCommandReceived"

export class VMServiceServer extends JDServiceServer {
    private eventNameToId: SMap<number> = {}
    private regNameToId: SMap<number> = {}
    private regFieldToId: SMap<number> = {}
    private commandPackets: SMap<Packet> = {}

    constructor(public role: string, public shortId: string, private spec: jdspec.ServiceSpec) {
        super(spec.classIdentifier)

        spec.packets.filter(isHighLevelRegister).map(reg => {
            const regServer = this.addRegister(reg.identifier)
            this.regNameToId[reg.name] = reg.identifier
            reg.fields?.forEach((pkt, index) => {
                this.regFieldToId[`${reg.name}:${pkt.name}`] = index
            })
            regServer.subscribe(CHANGE, () => {
                this.emit(VM_SERVER_REGISTER_CHANGED, this.role, reg.name)
            })
        })

        spec.packets.filter(isCommand).map(cmd => {
            this.addCommand(cmd.identifier, pkt => {
                this.emit(VM_SERVER_COMMAND_RECEIVED, this.role, pkt)
            })
        })

        spec.packets.filter(isHighLevelEvent).forEach(pkt => {
            this.eventNameToId[pkt.name] = pkt.identifier
        })
    }

    async sendEventNameAsync(eventName: string, values?: PackedValues) {
        const pkt = this.spec.packets.find(
            p => isHighLevelEvent(p) && p.name === eventName
        )
        if (pkt) {
            await this.sendEvent(
                this.eventNameToId[eventName],
                jdpack(pkt.packFormat, values)
            )
        }
    }

    lookupRegister(root: string, fld: string) {
        if (this.regNameToId[root]) {
            const reg = this.register(this.regNameToId[root])
            if (!fld) return reg.values()?.[0]
            else {
                return reg.values()?.[this.regFieldToId[`${root}:${fld}`]]
            }
        } else if (this.commandPackets[root]) {
            const cmd = this.commandPackets[root]
            // TODO: extract the field
            return undefined
        }
        return undefined
    }

    public writeRegister(root: string, ev: atomic[]) {
        const reg = this.register(this.regNameToId[root])
        reg.setValues(ev)
    }
}

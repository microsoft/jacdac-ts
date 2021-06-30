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
import JDRegisterServer from "../jdom/registerserver"

export const VM_SERVER_COMMAND_RECEIVED = "vmServerCommandReceived"
export const VM_SERVER_SET_REGISTER_REQUEST = "vmServerSetRequest"
export const VM_SERVER_GET_REGISTER_REQUEST = "vmServerGetRequest"

class VMRegisterServer extends JDRegisterServer<PackedValues> {
    constructor(private serviceServer: VMServiceServer, private reg: jdspec.PacketInfo, defaultValue?: PackedValues) {
        super(serviceServer, reg.identifier, defaultValue)
    }

    // on a get request, we want to invoke a VM function to respond
    // (if there is no function, we simply return the current value)
    async sendGetAsync() {
        this.serviceServer.raiseGetRegisterEvent(this.reg.name)
    }

    async theRealSendGetAsync() {
        await super.sendGetAsync()
    }
}

export class VMServiceServer extends JDServiceServer {
    private eventNameToId: SMap<number> = {}
    private regNameToId: SMap<number> = {}
    private regFieldToId: SMap<number> = {}
    private commandPackets: SMap<Packet> = {}

    constructor(public role: string, public shortId: string, private spec: jdspec.ServiceSpec) {
        super(spec.classIdentifier)

        spec.packets.filter(isHighLevelRegister).map(reg => {
            // TODO: we need to make our own register and add it here
            const regServer = this.addExistingRegister(new VMRegisterServer(this, reg))
            this.regNameToId[reg.name] = reg.identifier
            reg.fields?.forEach((pkt, index) => {
                this.regFieldToId[`${reg.name}:${pkt.name}`] = index
            })
            regServer.subscribe(CHANGE, () => {
                this.emit(VM_SERVER_SET_REGISTER_REQUEST, this.role, reg.name)
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

    raiseGetRegisterEvent(regName: string) {
        this.emit(VM_SERVER_GET_REGISTER_REQUEST, this.role, regName)
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

import {
    isHighLevelRegister,
    isHighLevelEvent,
    isCommand,
} from "../../../jacdac-ts/src/jdom/spec"
import { SMap } from "../jdom/utils"
import { jdpack, PackedValues } from "../jdom/pack"
import { atomic } from "./utils"
import { CHANGE } from "../jdom/constants"
import Packet from "../jdom/packet"
import { DecodedPacket } from "../jdom/pretty"
import JDRegisterServer from "../jdom/registerserver"
import { ExternalRequest } from "./environment"
import SensorServer from "../servers/sensorserver"

export const VM_EXTERNAL_REQUEST = "vmExternalRequest"

class VMRegisterServer extends JDRegisterServer<PackedValues> {
    constructor(
        private serviceServer: VMServiceServer,
        private reg: jdspec.PacketInfo,
        defaultValue?: PackedValues
    ) {
        super(serviceServer, reg.identifier, defaultValue)
    }

    async sendGetAsync() {
        this.serviceServer.raiseGetRegisterEvent(this.reg.name)
    }

    async theRealSendGetAsync() {
        await super.sendGetAsync()
    }
}

// TODO: need to take specification into account and
// TOOD: implement the proper base class (SensorServer)
export class VMServiceServer extends SensorServer<any[]> {
    private eventNameToId: SMap<number> = {}
    private regNameToId: SMap<number> = {}
    private regFieldToId: SMap<number> = {}
    private commandPackets: SMap<DecodedPacket> = {}
    private cmdFieldToId: SMap<number> = {}

    constructor(public role: string, private spec: jdspec.ServiceSpec) {
        super(spec.classIdentifier, {
            readingValues: [false],
            streamingInterval: 50,
        })
        spec.packets.filter(isHighLevelRegister).map(reg => {
            const regServer = this.addExistingRegister(
                new VMRegisterServer(this, reg)
            )
            this.regNameToId[reg.name] = reg.identifier
            reg.fields?.forEach((pkt, index) => {
                this.regFieldToId[`${reg.name}:${pkt.name}`] = index
            })
            regServer.subscribe(CHANGE, () => {
                this.emit(VM_EXTERNAL_REQUEST, <ExternalRequest>{
                    kind: "set",
                    role: this.role,
                    tgt: reg.name,
                })
            })
        })

        spec.packets.filter(isCommand).map(cmd => {
            this.addCommand(cmd.identifier, (pkt: Packet) => {
                this.commandPackets[cmd.identifier] = pkt.decoded
                this.emit(VM_EXTERNAL_REQUEST, <ExternalRequest>{
                    kind: "cmd",
                    role: this.role,
                    tgt: cmd.name,
                })
            })
            cmd.fields?.forEach((pkt, index) => {
                this.regFieldToId[`${cmd.name}:${pkt.name}`] = index
            })
        })

        spec.packets.filter(isHighLevelEvent).forEach(pkt => {
            this.eventNameToId[pkt.name] = pkt.identifier
        })
    }

    raiseGetRegisterEvent(regName: string) {
        this.emit(VM_EXTERNAL_REQUEST, <ExternalRequest>{
            kind: "get",
            role: this.role,
            tgt: regName,
        })
    }

    async respondToGetRegisterEvent(regName: string) {
        const reg = this.register(this.regNameToId[regName]) as VMRegisterServer
        await reg.theRealSendGetAsync()
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
            return cmd.decoded?.[this.cmdFieldToId[`${root}:${fld}`]]?.value
        }
        return undefined
    }

    public writeRegister(root: string, ev: atomic[]) {
        const reg = this.register(this.regNameToId[root])
        reg.setValues(ev)
    }
}

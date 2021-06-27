import JDServiceServer from "../jdom/serviceserver"
import {
    isHighLevelRegister,
    isHighLevelEvent,
    isCommand
} from "../../../jacdac-ts/src/jdom/spec"
import { SMap } from "../jdom/utils"
import { jdpack, PackedValues } from "../jdom/pack"

export class VMServiceServer extends JDServiceServer {
    private eventNameToId: SMap<number> = {}
    constructor(private role: string, private spec: jdspec.ServiceSpec) {
        super(spec.classIdentifier)

        spec.packets.filter(isHighLevelRegister).map(reg => {
            this.addRegister(reg.identifier)
            // nothing to do on a read of register from outside (server maintains current value)
            // on a write from outside, notify the VM of CHANGE of value
            // on a write from VM, notify outside of CHANGE (done already)
        })

        spec.packets.filter(isCommand).map(cmd => {
            this.addCommand(cmd.identifier, (pkt) => {
                // raise event to execute the command
                // sending the pkt along with the data
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
            await this.sendEvent(this.eventNameToId[eventName], 
                jdpack(pkt.packFormat, values))
        }
    }
}

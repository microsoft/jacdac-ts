import JDServiceServer from "../jdom/serviceserver"
import JDRegisterServer from "../jdom/registerserver"
import { PackedValues } from "../jdom/pack"
import {
    //isClientEvent,
    isClientRegister,
    //isCommand
} from "../../../jacdac-ts/src/jdom/spec"
import { SMap } from "../jdom/utils"

class VMRegisterServer extends JDRegisterServer<PackedValues> {
    constructor(parent: VMServiceServer, regId: number) {
        super(parent,regId)
    }
    
    // 0. regServer.packFormat
    // 1. regServer.setValues (before sendGetAsync) skipChangeEvent=true
    // 3. regServer.reset

    async sendGetAsync() {
        // await the VM code for computing the register's value
        // this.setValues
        super.sendGetAsync()
    }
}
export class VMServiceServer extends JDServiceServer {
    private regServersByName: SMap<VMRegisterServer> = {}
    private regServersById: SMap<VMRegisterServer> = {}
    constructor(spec: jdspec.ServiceSpec) {
        super(spec.classIdentifier)

        spec.packets.filter(isClientRegister).map(reg => {
            const regServer = new VMRegisterServer(
                this,
                reg.identifier
            )
            this.regServersByName[reg.name] = regServer
            this.regServersById[reg.identifier] = regServer
            
            // subscribe to CHANGE event for a write request
        })

        // TODO: events
    }


}

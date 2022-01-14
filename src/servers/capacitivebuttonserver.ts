import { CapacitiveButtonReg, SRV_CAPACITIVE_BUTTON } from "../jdom/constants"
import { JDServiceServer,  JDServerOptions } from "../jdom/servers/serviceserver"
import { JDRegisterServer } from "../jdom/servers/registerserver"

export class CapacitiveButtonServer extends JDServiceServer {
    readonly threshold: JDRegisterServer<[number]>

    constructor(options?: { threshold?: number } & JDServerOptions) {
        super(SRV_CAPACITIVE_BUTTON, options)
        const { threshold = 0.5 } = options || {}

        this.threshold = this.addRegister(CapacitiveButtonReg.Threshold, [
            threshold,
        ])
    }
}

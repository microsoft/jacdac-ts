import { CapacitiveButtonReg, SRV_CAPACITIVE_BUTTON } from "../jdom/constants"
import JDServiceServer, { ServerOptions } from "../jdom/serviceserver"
import RegisterServer from "../jdom/registerserver"

export default class CapacitiveButtonServer extends JDServiceServer {
    readonly threshold: RegisterServer<[number]>

    constructor(options?: { threshold?: number } & ServerOptions) {
        super(SRV_CAPACITIVE_BUTTON, options)
        const { threshold = 0.5 } = options || {}

        this.threshold = this.addRegister(CapacitiveButtonReg.Threshold, [
            threshold,
        ])
    }
}

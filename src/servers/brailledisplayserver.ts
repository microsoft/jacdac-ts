import { BrailleDisplayReg, SRV_BRAILLE_DISPLAY } from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer, JDServerOptions } from "../jdom/servers/serviceserver"

export class BrailleDisplayServer extends JDServiceServer {
    readonly patterns: JDRegisterServer<[string]>
    readonly enabled: JDRegisterServer<[boolean]>
    readonly length: JDRegisterServer<[number]>

    constructor(
        options?: { patterns?: string; length?: number } & JDServerOptions,
    ) {
        super(SRV_BRAILLE_DISPLAY, options)
        const { patterns = "", length = 12 } = options || {}

        this.patterns = this.addRegister<[string]>(BrailleDisplayReg.Patterns, [
            patterns,
        ])
        this.enabled = this.addRegister<[boolean]>(BrailleDisplayReg.Enabled, [
            false,
        ])
        this.length = this.addRegister<[number]>(BrailleDisplayReg.Length, [
            length,
        ])
    }
}

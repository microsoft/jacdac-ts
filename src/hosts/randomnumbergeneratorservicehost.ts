import {
    REGISTER_PRE_GET,
    RngReg,
    RngVariant,
    SRV_RNG,
} from "../jdom/constants"
import RegisterHost from "../jdom/registerhost"
import ServiceHost from "../jdom/servicehost"

export default class RandomNumberGeneratorServiceHost extends ServiceHost {
    readonly reading: RegisterHost<[Uint8Array]>
    constructor() {
        super(SRV_RNG, {
            variant: RngVariant.WebCrypto,
        })

        this.reading = this.addRegister(RngReg.Random, [new Uint8Array(64)])
        this.reading.on(REGISTER_PRE_GET, this.handleRefresh.bind(this))
    }

    private handleRefresh() {
        // generate new data
        const data = new Uint8Array(64)
        if (typeof window !== "undefined") window.crypto.getRandomValues(data)
        this.reading.setValues([data], true)
    }
}

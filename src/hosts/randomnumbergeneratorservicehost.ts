import { RngCmd, RngReg, RngVariant, SRV_RNG } from "../jdom/constants";
import Packet from "../jdom/packet";
import ServiceHost from "../jdom/servicehost";

export default class RandomNumberGeneratorServiceHost extends ServiceHost {
    constructor() {
        super(SRV_RNG, {
            variant: RngVariant.WebCrypto
        })

        this.addCommand(RngCmd.Random, this.handleRandom.bind(this));
    }

    private async handleRandom(pkt: Packet) {
        const [length] = pkt.jdunpack<[number]>("u8");
        const data = new Uint8Array(length);
        console.log("rnd", { data })
        if (typeof window !== "undefined")
            window.crypto.getRandomValues(data);
        const resp = Packet.from(RngCmd.Random, data);
        resp.serviceIndex = this.serviceIndex;
        await resp.sendReportAsync(pkt.device);
    }
}
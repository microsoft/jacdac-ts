import { DmxCmd, SRV_DMX } from "../jdom/constants";
import Packet from "../jdom/packet";
import ServiceHost from "../jdom/servicehost";
import { toHex } from "../jdom/utils";

export default class DMXServiceHost extends ServiceHost {
    constructor() {
        super(SRV_DMX, {
            intensityValues: [0]
        })

        this.addCommand(DmxCmd.Send, this.handleSend.bind(this));
    }

    private handleSend(pkt: Packet) {
        // ignore
        console.log(`dmx send`, toHex(pkt.data));
    }
}
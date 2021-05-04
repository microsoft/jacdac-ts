import { DmxCmd, SRV_DMX } from "../jdom/constants"
import Packet from "../jdom/packet"
import JDServiceServer from "../jdom/serviceserver"
import { toHex } from "../jdom/utils"

export default class DMXServer extends JDServiceServer {
    constructor() {
        super(SRV_DMX, {
            intensityValues: [0],
        })

        this.addCommand(DmxCmd.Send, this.handleSend.bind(this))
    }

    private handleSend(pkt: Packet) {
        // ignore
        console.log(`dmx send`, toHex(pkt.data))
    }
}

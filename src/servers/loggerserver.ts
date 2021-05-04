import {
    LoggerCmd,
    LoggerPriority,
    LoggerReg,
    SRV_LOGGER,
} from "../jdom/constants"
import Packet from "../jdom/packet"
import JDRegisterServer from "../jdom/registerserver"
import JDServiceServer from "../jdom/serviceserver"

export default class LoggerServer extends JDServiceServer {
    readonly minPriority: JDRegisterServer<[LoggerPriority]>

    constructor() {
        super(SRV_LOGGER)

        this.minPriority = this.addRegister(LoggerReg.MinPriority, [
            LoggerPriority.Silent,
        ])
    }

    async report(priority: LoggerCmd, msg: string) {
        const pkt = Packet.jdpacked<[string]>(priority, "s", [msg])
        await this.sendPacketAsync(pkt)
    }
}

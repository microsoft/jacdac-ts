import { LoggerCmd, LoggerPriority, LoggerReg, SRV_LOGGER } from "../jdom/constants";
import Packet from "../jdom/packet";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export default class LoggerServiceHost extends JDServiceHost {
    readonly minPriority: JDRegisterHost<[LoggerPriority]>;

    constructor() {
        super(SRV_LOGGER);

        this.minPriority = this.addRegister(LoggerReg.MinPriority, [LoggerPriority.Silent]);
    }

    async report(priority: LoggerCmd, msg: string) {
        const pkt = Packet.jdpacked<[string]>(priority, "s", [msg]);
        await this.sendPacketAsync(pkt);
    }
}
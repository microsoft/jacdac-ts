import { LoggerCmd, LoggerPriority, LoggerReg, SRV_LOGGER } from "../jdom/constants";
import Packet from "../jdom/packet";
import RegisterHost from "../jdom/registerhost";
import ServiceHost from "../jdom/servicehost";

export default class LoggerServiceHost extends ServiceHost {
    readonly minPriority: RegisterHost<[LoggerPriority]>;

    constructor() {
        super(SRV_LOGGER);

        this.minPriority = this.addRegister(LoggerReg.MinPriority, [LoggerPriority.Silent]);
    }

    async report(priority: LoggerCmd, msg: string) {
        const pkt = Packet.jdpacked<[string]>(priority, "s", [msg]);
        await this.sendPacketAsync(pkt);
    }
}
import { ControlAnnounceFlags, ControlCmd, IDENTIFY, RESET, SRV_CTRL } from "./constants";
import Packet from "./packet";
import JDServiceHost from "./servicehost";

export default class ControlServiceHost extends JDServiceHost {
    private restartCounter = 0;
    private packetCount = 0;

    constructor() {
        super(SRV_CTRL)

        this.addCommand(ControlCmd.Services, this.announce.bind(this));
        this.addCommand(ControlCmd.Identify, this.identify.bind(this));
        this.addCommand(ControlCmd.Reset, this.reset.bind(this));
        this.addCommand(ControlCmd.Noop, null);
    }

    async announce() {
        if (this.restartCounter < 0xf)
            this.restartCounter++
        this.packetCount++;
        // restartCounter, flags, packetCount, serviceClass
        const pkt = Packet.jdpacked<[number, ControlAnnounceFlags, number, number[]]>(ControlCmd.Services, "u8 u8 u8 x[1] u32[]",
            [this.restartCounter,
            ControlAnnounceFlags.SupportsACK,
            this.packetCount,
            this.device.services().slice(1).map(srv => srv.serviceClass)])

        this.sendPacketAsync(pkt);

        // reset counter
        this.packetCount = 0;
    }

    async identify() {
        this.emit(IDENTIFY);
    }

    async reset() {
        this.emit(RESET);
        this.restartCounter = 0;
        this.packetCount = 0;
    }
}

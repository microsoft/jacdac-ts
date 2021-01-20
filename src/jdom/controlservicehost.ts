import { ControlAnnounceFlags, ControlCmd, ControlReg, IDENTIFY, REPORT_RECEIVE, RESET, SRV_CTRL } from "./constants";
import Packet from "./packet";
import JDRegisterHost from "./registerhost";
import JDServiceHost from "./servicehost";

export default class ControlServiceHost extends JDServiceHost {
    readonly deviceDescription: JDRegisterHost<[string]>;
    readonly mcuTemperature: JDRegisterHost<[number]>;
    readonly resetIn: JDRegisterHost<[number]>;
    readonly uptime: JDRegisterHost<[number]>;
    readonly startTime: number;
    readonly statusLight: JDRegisterHost<[[number, number, number, number][]]>;

    constructor() {
        super(SRV_CTRL)

        this.startTime = Date.now();
        this.resetIn = this.addRegister<[number]>(ControlReg.ResetIn, [0]);
        this.deviceDescription = this.addRegister<[string]>(ControlReg.DeviceDescription);
        this.mcuTemperature = this.addRegister<[number]>(ControlReg.McuTemperature, [25]);
        this.resetIn = this.addRegister<[number]>(ControlReg.ResetIn);
        this.uptime = this.addRegister<[number]>(ControlReg.Uptime);
        this.statusLight = this.addRegister<[[number, number, number, number][]]>(ControlReg.StatusLight, [[]]);

        this.addCommand(ControlCmd.Services, this.announce.bind(this));
        this.addCommand(ControlCmd.Identify, this.identify.bind(this));
        this.addCommand(ControlCmd.Reset, this.handleReset.bind(this));
        this.addCommand(ControlCmd.Noop, null);
    }

    async announce() {
        // restartCounter, flags, packetCount, serviceClass
        const pkt = Packet.jdpacked<[number, ControlAnnounceFlags, number, number[]]>(ControlCmd.Services, "u8 u8 u8 x[1] u32[]",
            [
                this.device.restartCounter,
                ControlAnnounceFlags.SupportsACK,
                this.device.packetCount + 1,
                this.device.services().slice(1).map(srv => srv.serviceClass)
            ])

        this.sendPacketAsync(pkt);

        // update uptime
        this.uptime.setValues([Date.now() - this.startTime]);
    }

    async identify() {
        this.emit(IDENTIFY);
    }

    private handleReset() {
        this.device.reset();
    }
}

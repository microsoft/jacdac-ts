import {
    ControlAnnounceFlags,
    ControlCmd,
    ControlReg,
    IDENTIFY,
    SRV_CTRL,
} from "./constants"
import Packet from "./packet"
import JDRegisterServer from "./registerserver"
import JDServiceServer from "./serviceserver"

export default class ControlServer extends JDServiceServer {
    readonly deviceDescription: JDRegisterServer<[string]>
    readonly mcuTemperature: JDRegisterServer<[number]>
    readonly resetIn: JDRegisterServer<[number]>
    readonly uptime: JDRegisterServer<[number]>
    private startTime: number

    constructor() {
        super(SRV_CTRL)

        this.startTime = Date.now()
        this.resetIn = this.addRegister<[number]>(ControlReg.ResetIn, [0])
        this.deviceDescription = this.addRegister<[string]>(
            ControlReg.DeviceDescription
        )
        this.mcuTemperature = this.addRegister<[number]>(
            ControlReg.McuTemperature,
            [25]
        )
        this.resetIn = this.addRegister<[number]>(ControlReg.ResetIn)
        this.uptime = this.addRegister<[number]>(ControlReg.Uptime)

        this.addCommand(ControlCmd.Services, this.announce.bind(this))
        this.addCommand(ControlCmd.Identify, this.identify.bind(this))
        this.addCommand(ControlCmd.Reset, this.handleReset.bind(this))
        this.addCommand(ControlCmd.Noop, null)
        this.addCommand(
            ControlCmd.SetStatusLight,
            this.handleSetStatusLight.bind(this)
        )
    }

    async announce() {
        // restartCounter, flags, packetCount, serviceClass
        const pkt = Packet.jdpacked<
            [number, ControlAnnounceFlags, number, number[]]
        >(ControlCmd.Services, "u8 u8 u8 x[1] u32[]", [
            this.device.restartCounter,
            ControlAnnounceFlags.SupportsACK,
            this.device.packetCount + 1,
            this.device
                .services()
                .slice(1)
                .map(srv => srv.serviceClass),
        ])

        await this.sendPacketAsync(pkt)

        // micros
        this.uptime.setValues([(Date.now() - this.startTime) * 100], true)
    }

    async identify() {
        this.emit(IDENTIFY)
    }

    private handleReset() {
        this.startTime = Date.now()
        this.device.reset()
    }

    private handleSetStatusLight(pkt: Packet) {
        // TODO
    }
}

import {
    ControlAnnounceFlags,
    ControlCmd,
    ControlReg,
    IDENTIFY,
    SRV_CONTROL,
} from "../constants"
import { Packet } from "../packet"
import { JDRegisterServer } from "./registerserver"
import { JDServiceServer } from "./serviceserver"

/**
 * A control service server
 * @category Servers
 */
export class ControlServer extends JDServiceServer {
    readonly deviceDescription: JDRegisterServer<[string]>
    readonly mcuTemperature: JDRegisterServer<[number]>
    readonly resetIn: JDRegisterServer<[number]>
    readonly uptime: JDRegisterServer<[number]>
    private startTime: number

    constructor(options?: { resetIn?: boolean; deviceDescription?: string }) {
        super(SRV_CONTROL)
        const { resetIn, deviceDescription } = options || {}
        this.startTime = Date.now()
        this.deviceDescription = this.addRegister<[string]>(
            ControlReg.DeviceDescription,
            [deviceDescription || "Simulated"]
        )
        this.mcuTemperature = this.addRegister<[number]>(
            ControlReg.McuTemperature,
            [25]
        )
        this.uptime = this.addRegister<[number]>(ControlReg.Uptime)
        if (resetIn)
            this.resetIn = this.addRegister<[number]>(ControlReg.ResetIn, [0])

        this.addRegister(ControlReg.FirmwareVersion, ["0.0.0"])
        this.addRegister(ControlReg.ProductIdentifier, [0])
        this.addRegister(ControlReg.BootloaderProductIdentifier, [0])

        this.addCommand(ControlCmd.Services, this.announce.bind(this))
        this.addCommand(ControlCmd.Identify, this.identify.bind(this))
        this.addCommand(ControlCmd.Reset, this.handleReset.bind(this))
        this.addCommand(ControlCmd.Noop, null)
    }

    async announce() {
        // restartCounter, flags, packetCount, serviceClass
        const pkt = Packet.jdpacked<[ControlAnnounceFlags, number, number[]]>(
            ControlCmd.Services,
            "u16 u8 x[1] u32[]",
            [
                this.device.restartCounter |
                    ControlAnnounceFlags.StatusLightRgbNoFade |
                    ControlAnnounceFlags.SupportsACK,
                this.device.packetCount + 1,
                this.device
                    .services()
                    .slice(1)
                    .map(srv => srv.serviceClass),
            ]
        )

        await this.sendPacketAsync(pkt)

        // micros
        this.uptime.setValues([(Date.now() - this.startTime) * 100], true)

        // check if we need to reset
        if (this.resetIn) {
            const [resetIn] = this.resetIn.values()
            if (resetIn) {
                const resetTimestamp = resetIn / 1000 + this.resetIn.lastSetTime
                if (resetTimestamp < this.device.bus.timestamp) {
                    // reset in expired
                    console.debug(`${this} reset in expired`, {
                        resetIn,
                        lastSet: this.resetIn.lastSetTime,
                        resetTimestamp,
                    })
                    this.device.reset()
                }
            }
        }
    }

    async identify() {
        this.emit(IDENTIFY)
    }

    private handleReset() {
        this.startTime = Date.now()
        this.device.reset()
    }
}

import {
    CHANGE,
    ControlAnnounceFlags,
    ControlCmd,
    ControlReg,
    IDENTIFY,
    SRV_CTRL,
} from "./constants"
import { jdunpack } from "./pack"
import Packet from "./packet"
import JDRegisterServer from "./registerserver"
import JDServiceServer from "./serviceserver"

export default class ControlServer extends JDServiceServer {
    readonly deviceDescription: JDRegisterServer<[string]>
    readonly mcuTemperature: JDRegisterServer<[number]>
    readonly resetIn: JDRegisterServer<[number]>
    readonly uptime: JDRegisterServer<[number]>
    private startTime: number

    statusLightColor: number = undefined

    constructor(options?: { resetIn?: boolean }) {
        super(SRV_CTRL)
        const { resetIn } = options || {}
        this.startTime = Date.now()
        this.deviceDescription = this.addRegister<[string]>(
            ControlReg.DeviceDescription
        )
        this.mcuTemperature = this.addRegister<[number]>(
            ControlReg.McuTemperature,
            [25]
        )
        this.uptime = this.addRegister<[number]>(ControlReg.Uptime)
        if (resetIn)
            this.resetIn = this.addRegister<[number]>(ControlReg.ResetIn, [0])

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

    private handleSetStatusLight(pkt: Packet) {
        const [toRed, toGreen, toBlue] = jdunpack<
            [number, number, number, number]
        >(pkt.data, "u8 u8 u8 u8")
        this.statusLightColor = (toRed << 16) | (toGreen << 8) | toBlue
        this.emit(CHANGE)
    }
}

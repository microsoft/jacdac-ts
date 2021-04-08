import {
    ControlAnnounceFlags,
    ControlCmd,
    ControlReg,
    IDENTIFY,
    SRV_CTRL,
    STATUS_LIGHT_CHANGE,
} from "./constants"
import Packet from "./packet"
import RegisterHost from "./registerhost"
import ServiceHost from "./servicehost"

const STATUS_LIGHT_ANIMATION_RATE = 512

interface StatusLightState {
    current: [number, number, number]
    from?: [number, number, number]
    to?: [number, number, number]
    start?: number
    speed?: number
}

export default class ControlServiceHost extends ServiceHost {
    readonly deviceDescription: RegisterHost<[string]>
    readonly mcuTemperature: RegisterHost<[number]>
    readonly resetIn: RegisterHost<[number]>
    readonly uptime: RegisterHost<[number]>
    readonly startTime: number

    private _statusLightState: StatusLightState = {
        current: [0, 0, 0],
    }

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

        this.uptime.setValues([Date.now() - this.startTime], true)
    }

    async identify() {
        this.emit(IDENTIFY)
    }

    private handleReset() {
        this.device.reset()
    }

    get statusLightColor() {
        return this._statusLightState.current.slice(0)
    }

    private handleSetStatusLight(pkt: Packet) {
        const [toRed, toGreen, toBlue, speed] = pkt.jdunpack<
            [number, number, number, number]
        >("u8 u8 u8 u8")
        // start animation
        this._statusLightState.from = this._statusLightState.current
        this._statusLightState.to = [toRed, toGreen, toBlue]
        this._statusLightState.speed = speed
        this._statusLightState.start = this.device.bus.timestamp
        this.updateStatusLight()
    }

    private updateStatusLight() {
        const { to } = this._statusLightState
        if (!to) return
        const { from, speed, start } = this._statusLightState

        const duration = !speed ? 0 : STATUS_LIGHT_ANIMATION_RATE / speed
        const now = this.device.bus.timestamp
        const ratio = !duration ? 1 : Math.min(1, (now - start) / duration)
        const onemratio = 1 - ratio

        this._statusLightState.current = [
            (onemratio * from[0] + ratio * to[0]) | 0,
            (onemratio * from[1] + ratio * to[1]) | 0,
            (onemratio * from[2] + ratio * to[2]) | 0,
        ]
        if (ratio >= 1) {
            // animation done, release arrays
            this._statusLightState.from = undefined
            this._statusLightState.to = undefined
        }

        this.emit(STATUS_LIGHT_CHANGE)
    }
}

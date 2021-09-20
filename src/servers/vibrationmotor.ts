import {
    REFRESH,
    SRV_VIBRATION_MOTOR,
    VibrationMotorCmd,
    VibrationMotorReg,
} from "../jdom/constants"
import Packet from "../jdom/packet"
import JDRegisterServer from "../jdom/servers/registerserver"
import JDServiceServer from "../jdom/servers/serviceserver"

export default class VibrationMotor extends JDServiceServer {
    readonly enabled: JDRegisterServer<[boolean]>

    private _animation: {
        start: number
        pattern: [number, number][]
    }

    constructor() {
        super(SRV_VIBRATION_MOTOR)
        this.enabled = this.addRegister<[boolean]>(VibrationMotorReg.Enabled, [
            false,
        ])
        this.addCommand(
            VibrationMotorCmd.Vibrate,
            this.handleVibrate.bind(this)
        )
        this.on(REFRESH, this.handleRefresh.bind(this))
    }

    private handleRefresh() {
        if (!this._animation) return // nothing to do
        // TODO
    }

    private handleVibrate(pkt: Packet) {
        // TODO
    }
}

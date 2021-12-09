import {
    CHANGE,
    REFRESH,
    SRV_VIBRATION_MOTOR,
    VibrationMotorCmd,
} from "../jdom/constants"
import Packet from "../jdom/packet"
import JDServiceServer from "../jdom/servers/serviceserver"

export default class VibrationMotorServer extends JDServiceServer {
    static VIBRATE_PATTERN = "vibratePattern"

    private _animation: {
        start: number
        pattern: [number, number][]
    }
    private _animationStep = -1

    constructor() {
        super(SRV_VIBRATION_MOTOR)
        this.addCommand(
            VibrationMotorCmd.Vibrate,
            this.handleVibrate.bind(this)
        )
        this.on(REFRESH, this.handleRefresh.bind(this))
    }

    private handleRefresh() {
        if (!this._animation) return // nothing to do

        const { start, pattern } = this._animation
        const now = this.device.bus.timestamp
        const elapsed = now - start
        let t = 0
        for (let i = 0; i < pattern.length; ++i) {
            const [duration, speed] = pattern[i]
            const dt = duration << 3
            t += dt
            if (t - dt <= elapsed && t > elapsed) {
                // we're playing this note
                if (this._animationStep !== i) {
                    this._animationStep = i
                    this.emit(VibrationMotorServer.VIBRATE_PATTERN, {
                        duration,
                        speed,
                    })
                }
                break
            }
        }
        if (elapsed > t) {
            // animation finished
            this._animation = undefined
            this._animationStep = -1
            this.emit(VibrationMotorServer.VIBRATE_PATTERN, {
                duration: 0,
                speed: 0,
            })
            this.emit(CHANGE)
        }
    }

    private handleVibrate(pkt: Packet) {
        const [pattern] = pkt.jdunpack<[[number, number][]]>("r: u8 u0.8")
        this._animation = {
            start: this.device.bus.timestamp,
            pattern,
        }
        this._animationStep = -1
        if (pattern.length) {
            const [duration, speed] = pattern[0]
            this._animationStep = 0
            this.emit(VibrationMotorServer.VIBRATE_PATTERN, {
                duration,
                speed,
            })
        }
        this.emit(CHANGE)
    }
}

import {
    LedCmd,
    LedReg,
    LedVariant,
    REGISTER_PRE_GET,
    SRV_LED,
} from "../jdom/constants"
import Packet from "../jdom/packet"
import JDRegisterServer from "../jdom/registerserver"
import JDServiceServer, { ServerOptions } from "../jdom/serviceserver"
export default class LEDServer extends JDServiceServer {
    readonly color: JDRegisterServer<[number, number, number]>
    readonly maxPower: JDRegisterServer<[number]>
    readonly ledCount: JDRegisterServer<[number]>
    readonly luminousIntensity: JDRegisterServer<[number]>
    readonly waveLength: JDRegisterServer<[number]>
    readonly variant: JDRegisterServer<[LedVariant]>

    private _animation: {
        red: number
        green: number
        blue: number
        toRed: number
        toGreen: number
        toBlue: number
        speed: number
        start: number
    }

    constructor(
        options?: {
            ledCount?: number
            variant?: LedVariant
            luminousIntensity?: number
            waveLength?: number
            maxPower?: number
            color?: [number, number, number]
        } & ServerOptions
    ) {
        super(SRV_LED, options)
        const {
            ledCount = 1,
            variant = LedVariant.ThroughHole,
            luminousIntensity,
            waveLength,
            color = [255, 0, 0],
            maxPower = 200,
        } = options || {}

        this.color = this.addRegister<[number, number, number]>(
            LedReg.Color,
            color
        )
        this.color.on(REGISTER_PRE_GET, this.updateColor.bind(this))
        this.maxPower = this.addRegister(LedReg.MaxPower, [maxPower])
        this.ledCount = this.addRegister(LedReg.LedCount, [ledCount])
        if (luminousIntensity !== undefined)
            this.luminousIntensity = this.addRegister(
                LedReg.LuminousIntensity,
                [luminousIntensity]
            )
        if (waveLength !== undefined)
            this.waveLength = this.addRegister(LedReg.WaveLength, [waveLength])
        this.variant = this.addRegister(LedReg.Variant, [variant])

        this.addCommand(LedCmd.Animate, this.handleAnimate.bind(this))
    }

    private updateColor() {
        if (!this._animation) return // nothing to do

        // compute new color
        const { red, green, blue, toRed, toGreen, toBlue, speed, start } =
            this._animation
        const now = this.device.bus.timestamp
        const elapsed = now - start
        // see control.md
        const total = ((512 / speed) * 100) | 0
        const progress = elapsed / total // may overshoot
        const alpha = Math.min(1, progress)
        const oneAlpha = 1 - alpha

        const newRed = (red * alpha + oneAlpha * toRed) | 0
        const newGreen = (green * alpha + oneAlpha * toGreen) | 0
        const newBlue = (blue * alpha + oneAlpha * toBlue) | 0

        this.color.setValues([newRed, newGreen, newBlue], true)

        // clear animation when done
        if (progress > 1) this._animation = undefined
    }

    private handleAnimate(pkt: Packet) {
        const [toRed, toGreen, toBlue, speed] =
            pkt.jdunpack<[number, number, number, number]>("u8 u8 u8 u8")

        if (speed == 0) {
            this.color.setValues([toRed, toGreen, toBlue])
            this._animation = undefined
        } else {
            const [red, green, blue] = this.color.values()

            this._animation = {
                red,
                green,
                blue,
                toRed,
                toGreen,
                toBlue,
                speed,
                start: this.device.bus.timestamp,
            }
        }
    }
}

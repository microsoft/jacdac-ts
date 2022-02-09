import {
    CHANGE,
    LedDisplayLightType,
    LedDisplayReg,
    MAX_PIXELS_LENGTH,
    SRV_LED_DISPLAY,
} from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer, JDServerOptions } from "../jdom/servers/serviceserver"

function SCALE0(c: number, i: number) {
    return ((c & 0xff) * (1 + (i & 0xff))) >> 8
}

export class LedDisplayServer extends JDServiceServer {
    readonly pixels: JDRegisterServer<[Uint8Array]>
    readonly brightness: JDRegisterServer<[number]>
    readonly actualBrightness: JDRegisterServer<[number]>
    readonly lightType: JDRegisterServer<[LedDisplayLightType]>
    readonly numPixels: JDRegisterServer<[number]>
    readonly maxPower: JDRegisterServer<[number]>
    readonly numColumns: JDRegisterServer<[number]>

    constructor(
        options?: {
            numPixels?: number
            numColumns?: number
            maxPower?: number
        } & JDServerOptions
    ) {
        super(SRV_LED_DISPLAY, options)

        const { numColumns, maxPower = 200, numPixels = 10 } = options || {}

        const n = Math.min(MAX_PIXELS_LENGTH, numPixels)

        this.pixels = this.addRegister<[Uint8Array]>(LedDisplayReg.Pixels, [
            new Uint8Array(n * 3),
        ])
        this.brightness = this.addRegister<[number]>(LedDisplayReg.Brightness, [
            15,
        ])
        this.actualBrightness = this.addRegister<[number]>(
            LedDisplayReg.ActualBrightness,
            [15]
        )
        this.lightType = this.addRegister<[LedDisplayLightType]>(
            LedDisplayReg.LightType,
            [LedDisplayLightType.WS2812B_GRB]
        )
        this.numPixels = this.addRegister<[number]>(LedDisplayReg.NumPixels, [
            n,
        ])
        this.maxPower = this.addRegister<[number]>(LedDisplayReg.MaxPower, [
            maxPower,
        ])
        if (numColumns !== undefined)
            this.numColumns = this.addRegister<[number]>(
                LedDisplayReg.NumColumns,
                [numColumns]
            )

        this.brightness.on(CHANGE, () => {
            this.intensity = this.requested_intensity
            this.limit_intensity()
        })
        this.pixels.on(CHANGE, () => this.limit_intensity())
    }

    /**
     * Gets an array of RGB color numbers
     */
    get colors() {
        return this.pixels.data
    }

    private get maxpower(): number {
        const [r] = this.maxPower.values() || [200]
        return r
    }

    private get numpixels(): number {
        const [r] = this.numPixels.values() || [0]
        return r
    }

    private get requested_intensity(): number {
        const [r] = this.brightness.values() || [0]
        return r
    }

    private get intensity(): number {
        const [r] = this.actualBrightness.values() || [0]
        return r
    }

    private set intensity(v: number) {
        this.actualBrightness.setValues([v])
    }

    get enabled() {
        return this.numpixels > 0 && this.requested_intensity > 0
    }

    private limit_intensity() {
        const pxbuffer = this.pixels.data
        const { numpixels, requested_intensity, maxpower } = this

        let n = numpixels * 3
        const prev_intensity = this.intensity
        let intensity = this.intensity

        intensity += 1 + (intensity >> 5)
        if (
            requested_intensity !== undefined &&
            intensity > requested_intensity
        )
            intensity = requested_intensity

        let current_full = 0
        let current = 0
        let current_prev = 0
        let di = 0
        while (n--) {
            const v = pxbuffer[di++]
            current += SCALE0(v, intensity)
            current_prev += SCALE0(v, prev_intensity)
            current_full += v
        }

        // 46uA per step of LED
        current *= 46
        current_prev *= 46
        current_full *= 46

        // 14mA is the chip at 48MHz, 930uA per LED is static
        const base_current = 14000 + 930 * numpixels
        const current_limit = maxpower * 1000 - base_current

        if (current <= current_limit) {
            this.intensity = intensity
            // LOG("curr: %dmA; not limiting %d", (base_current + current) / 1000, state->intensity);
            return
        }

        if (current_prev <= current_limit) {
            return // no change needed
        }

        let inten = current_limit / (current_full >> 8) - 1
        if (inten < 0) inten = 0
        this.intensity = inten
    }
}

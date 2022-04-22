import {
    CHANGE,
    LedReg,
    CONST_LED_MAX_PIXELS_LENGTH,
    SRV_LED,
} from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer, JDServerOptions } from "../jdom/servers/serviceserver"

function SCALE0(c: number, i: number) {
    return ((c & 0xff) * (1 + (i & 0xff))) >> 8
}

export interface LedServerOptions extends JDServerOptions {
    numPixels?: number
    numColumns?: number
    ledsPerPixel?: number
    luminousIntensity?: number
    waveLength?: number
    maxPower?: number
    color?: [number, number, number]
}

export class LedServer extends JDServiceServer {
    readonly pixels: JDRegisterServer<[Uint8Array]>
    readonly brightness: JDRegisterServer<[number]>
    readonly actualBrightness: JDRegisterServer<[number]>
    readonly numPixels: JDRegisterServer<[number]>
    readonly maxPower: JDRegisterServer<[number]>
    readonly numColumns: JDRegisterServer<[number]>
    readonly ledsPerPixel: JDRegisterServer<[number]>
    readonly luminousIntensity: JDRegisterServer<[number]>
    readonly waveLength: JDRegisterServer<[number]>

    constructor(options?: LedServerOptions) {
        super(SRV_LED, options)

        const {
            numColumns,
            maxPower = 200,
            numPixels = 10,
            ledsPerPixel,
            luminousIntensity,
            waveLength,
        } = options || {}

        const n = Math.min(CONST_LED_MAX_PIXELS_LENGTH, numPixels)

        this.pixels = this.addRegister<[Uint8Array]>(LedReg.Pixels, [
            new Uint8Array(n * 3),
        ])
        this.brightness = this.addRegister<[number]>(LedReg.Brightness, [15])
        this.actualBrightness = this.addRegister<[number]>(
            LedReg.ActualBrightness,
            [15]
        )
        this.numPixels = this.addRegister<[number]>(LedReg.NumPixels, [n])
        this.maxPower = this.addRegister<[number]>(LedReg.MaxPower, [maxPower])
        if (numColumns !== undefined)
            this.numColumns = this.addRegister<[number]>(LedReg.NumColumns, [
                numColumns,
            ])
        if (ledsPerPixel !== undefined)
            this.ledsPerPixel = this.addRegister(LedReg.LedsPerPixel, [
                ledsPerPixel,
            ])
        if (luminousIntensity !== undefined)
            this.luminousIntensity = this.addRegister(
                LedReg.LuminousIntensity,
                [luminousIntensity]
            )
        if (waveLength !== undefined)
            this.waveLength = this.addRegister(LedReg.WaveLength, [waveLength])

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

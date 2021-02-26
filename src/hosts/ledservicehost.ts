import { CHANGE, LedReg, LedVariant, SRV_LED } from "../jdom/constants";
import { JDEventSource } from "../jdom/eventsource";
import RegisterHost from "../jdom/registerhost";
import ServiceHost from "../jdom/servicehost";

export type LedAnimationFrame = [number, number, number, number]
export type LedAnimationData = [
    number,
    LedAnimationFrame[]
]

export class LedAnimation extends JDEventSource {
    private _currentStep: number;
    private _currentStepStartTime: number;
    private _currentHsv: number;

    constructor(public data: LedAnimationData) {
        super();

        this._currentStep = 0;
        this._currentStepStartTime = 0;
        this._currentHsv = 0;
    }

    get hsv(): [number, number, number] {
        return [
            (this._currentHsv >> 16) & 0xff,
            (this._currentHsv >> 8) & 0xff,
            (this._currentHsv) & 0xff
        ]
    }

    update(now: number) {
        // grab current step
        const [repetitions, steps] = this.data || [];

        if (!steps?.length) {
            // nothing to do
            return;
        }

        // find the step we are in
        if (this._currentStepStartTime == 0)
            this._currentStepStartTime = now;

        while (this._currentStep < steps.length) {
            const [h, s, v, duration8] = steps[this._currentStep];
            const duration = duration8 << 3;
            if (duration === 0)
                break;
            const elapsed = now - this._currentStepStartTime;
            if (elapsed < duration) {
                break;
            }

            // restart iteration if needed
            if (this._currentStep === steps.length - 1) {
                // restart
                this._currentStep = 0;
                this._currentStepStartTime = now;
            } else {
                // try next step
                this._currentStep++;
                this._currentStepStartTime += duration;
            }
        }

        // render
        if (this._currentStep < steps.length) {
            const [startHue, startSat, startValue, duration8] = steps[this._currentStep];
            const duration = duration8 << 3;
            const [endHue, endSat, endValue,] = steps[(this._currentStep + 1) % steps.length]

            const elapsed = now - this._currentStepStartTime;
            const alpha = elapsed / (duration);
            const oneAlpha = 1 - alpha;

            const h = oneAlpha * startHue + alpha * endHue;
            const s = oneAlpha * startSat + alpha * endSat;
            const v = oneAlpha * startValue + alpha * endValue;
            const hsv = ((h & 0xff) << 16) | ((s & 0xff) << 8) | (v & 0xff)

            if (hsv !== this._currentHsv) {
                this._currentHsv = hsv;
                this.emit(CHANGE);
            }
        }
    }
}

export default class LEDServiceHost extends ServiceHost {
    readonly animation: RegisterHost<LedAnimationData>;
    readonly brightness: RegisterHost<[number]>;
    readonly maxPower: RegisterHost<[number]>;
    readonly ledCount: RegisterHost<[number]>;
    readonly luminousIntensity: RegisterHost<[number]>;
    readonly waveLength: RegisterHost<[number]>;
    readonly variant: RegisterHost<[LedVariant]>;

    constructor(options?: {
        ledCount?: number,
        brightness?: number,
        variant?: LedVariant,
        luminousIntensity?: number,
        waveLength?: number,
        maxPower?: number,
        animation?: LedAnimationData
    }) {
        super(SRV_LED);
        const { ledCount = 1, variant = LedVariant.ThroughHole, brightness = 0.5,
            luminousIntensity, waveLength, animation = [0, []], maxPower = 200 } = options || {};

        this.animation = this.addRegister<LedAnimationData>(LedReg.Animation, animation)
        this.brightness = this.addRegister(LedReg.Brightness, [brightness]);
        this.maxPower = this.addRegister(LedReg.MaxPower, [maxPower]);
        this.ledCount = this.addRegister(LedReg.LedCount, [ledCount]);
        if (luminousIntensity !== undefined)
            this.luminousIntensity = this.addRegister(LedReg.LuminousIntensity, [luminousIntensity])
        if (waveLength !== undefined)
            this.waveLength = this.addRegister(LedReg.WaveLength, [waveLength]);
        this.variant = this.addRegister(LedReg.Variant, [variant])
    }
}
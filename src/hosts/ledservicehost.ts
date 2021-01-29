import { CHANGE, LedReg, LedVariant, REPORT_UPDATE, SRV_LED } from "../jdom/constants";
import { JDEventSource } from "../jdom/eventsource";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export type LedAnimationFrame = [number, number, number, number]
export type LedAnimationStepsType = [LedAnimationFrame[]];

export class LedAnimation extends JDEventSource {
    private _currentStep: number;
    private _currentStepStartTime: number;
    private _currentHsv: number;

    constructor(public steps: LedAnimationFrame[]) {
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
        const steps = this.steps;
        if (!steps?.length) {
            // nothing to do
            return;
        }

        // find the step we are in
        if (this._currentStepStartTime == 0)
            this._currentStepStartTime = now;

        while (this._currentStep < steps.length) {
            const [, duration8] = steps[this._currentStep];
            const duration = duration8 << 3;
            if (duration === 0)
                break;
            const elapsed = now - this._currentStepStartTime;
            if (elapsed < duration << 3) {
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
            const [endHue, endSat, endValue,] = steps[(this._currentStep + 1) % steps.length]

            const elapsed = now - this._currentStepStartTime;
            const alpha = elapsed / (duration8 << 3);
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

export default class LEDServiceHost extends JDServiceHost {
    readonly steps: JDRegisterHost<LedAnimationStepsType>;
    readonly brightness: JDRegisterHost<[number]>;
    readonly maxPower: JDRegisterHost<[number]>;
    readonly ledCount: JDRegisterHost<[number]>;
    readonly luminousIntensity: JDRegisterHost<[number]>;
    readonly waveLength: JDRegisterHost<[number]>;
    readonly variant: JDRegisterHost<[LedVariant]>;

    constructor(options?: {
        ledCount?: number,
        variant?: LedVariant,
        luminousIntensity?: number,
        waveLength?: number
    }) {
        super(SRV_LED);
        const { ledCount, variant,
            luminousIntensity, waveLength } = options || {};

        this.steps = this.addRegister<LedAnimationStepsType>(LedReg.Steps, [
            [
                [0, 0, 0, 0xf0],
                [0, 0xff, 0xff, 0xf0],
            ]
        ])
        this.brightness = this.addRegister(LedReg.Brightness, [0xffff]);
        this.maxPower = this.addRegister(LedReg.MaxPower, [200]);
        this.ledCount = this.addRegister(LedReg.LedCount, [ledCount || 1]);
        if (luminousIntensity !== undefined)
            this.luminousIntensity = this.addRegister(LedReg.LuminousIntensity, [luminousIntensity])
        if (waveLength !== undefined)
            this.waveLength = this.addRegister(LedReg.WaveLength, [waveLength]);
        this.variant = this.addRegister(LedReg.Variant, [variant || LedVariant.ThroughHole])
    }
}
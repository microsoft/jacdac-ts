import { CHANGE, LedReg, LedVariant, REPORT_UPDATE, SRV_LED } from "../jdom/constants";
import { JDEventSource } from "../jdom/eventsource";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export type LedAnimationFrame = [number, number, number, number]
export type LedAnimationStepsType = [LedAnimationFrame[]];

export class LedAnimation extends JDEventSource {
    private _currentStep: number;
    private _currentStepStartTime: number;
    private _currentItensity: number;

    constructor(
        public maxIterations: number,
        public brightness: number,
        public currentIteration: number,
        public steps: LedAnimationFrame[]
    ) {
        super();

        this.maxIterations = this.maxIterations || 1;
        this.brightness = this.brightness !== undefined ? this.brightness : 0xffff;
        this.currentIteration = this.currentIteration || 0;

        this._currentStep = 0;
        this._currentStepStartTime = 0;
        this._currentItensity = 0;
    }

    get intensity() {
        return (this._currentItensity * this.brightness) / (0xffff * 0xffff);
    }

    update(now: number) {
        // check iteration count
        const currentIteration = this.currentIteration;
        const maxIterations = this.maxIterations;

        if (currentIteration > maxIterations)
            return;

        // don't animate when brightness is 0
        const brightness = this.brightness;
        if (brightness === 0)
            return;

        // grab current step
        const steps = this.steps;
        if (!steps?.length) {
            this._currentItensity = 0;
            return;
        }

        // find the step we are in
        if (this._currentStepStartTime == 0)
            this._currentStepStartTime = now;
        let iteration = currentIteration;

        while (this._currentStep < steps.length) {
            const [, duration] = steps[this._currentStep];
            if (duration === 0)
                break;
            const elapsed = now - this._currentStepStartTime;
            if (elapsed < duration) {
                break;
            }

            // restart iteration if needed
            if (this._currentStep === steps.length - 1) {
                iteration++;

                // done iterating?
                if (iteration >= maxIterations)
                    break;

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
            const [startIntensity, duration] = steps[this._currentStep];
            const [endItensity,] = steps[(this._currentStep + 1) % steps.length]

            const elapsed = now - this._currentStepStartTime;
            const alpha = elapsed / duration;
            const intensity = (1 - alpha) * startIntensity + alpha * endItensity;

            if (intensity !== this._currentItensity) {
                this._currentItensity = intensity;
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
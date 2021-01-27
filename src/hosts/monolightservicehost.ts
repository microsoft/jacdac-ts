import { CHANGE, MonoLightReg, REPORT_UPDATE, SRV_MONO_LIGHT } from "../jdom/constants";
import { JDEventSource } from "../jdom/eventsource";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export type MonoLightStep = [number, number];
export type MonoLightStepsType = [MonoLightStep[]];

export class MonoLightAnimation extends JDEventSource {
    private _currentStep: number;
    private _currentStepStartTime: number;
    private _currentItensity: number;

    constructor(
        public maxIterations: number,
        public brightness: number,
        public currentIteration: number,
        public steps: MonoLightStep[]
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

export default class MonoLightServiceHost extends JDServiceHost {
    readonly steps: JDRegisterHost<MonoLightStepsType>;
    readonly brightness: JDRegisterHost<[number]>;
    readonly maxPower: JDRegisterHost<[number]>;
    readonly maxSteps: JDRegisterHost<[number]>;
    readonly currentIteration: JDRegisterHost<[number]>;
    readonly maxIterations: JDRegisterHost<[number]>;

    constructor() {
        super(SRV_MONO_LIGHT);

        this.steps = this.addRegister<MonoLightStepsType>(MonoLightReg.Steps, [
            [
                [0, 1000],
                [0xffff, 1000],
            ]
        ]);
        this.brightness = this.addRegister(MonoLightReg.Brightness, [0xffff]);
        this.maxPower = this.addRegister(MonoLightReg.MaxPower, [200]);
        this.maxSteps = this.addRegister(MonoLightReg.MaxSteps, [10]);
        this.currentIteration = this.addRegister(MonoLightReg.CurrentIteration, [0]);
        this.maxIterations = this.addRegister(MonoLightReg.MaxIterations, [0xffff]);

        this.steps.on(REPORT_UPDATE, this.handleSteps.bind(this));
    }

    private handleSteps() {
        // drop extras steps
        const [maxSteps] = this.maxSteps.values();
        const [steps] = this.steps.values();
        if (steps.length > maxSteps)
            this.steps.setValues([steps.slice(0, maxSteps)], false);
        // reset counter
        this.currentIteration.setValues([0])
    }
}
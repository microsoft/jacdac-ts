import { CHANGE, MonoLightReg, REFRESH, REPORT_UPDATE, SRV_MONO_LIGHT } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export type MonoLightStepsType = [([number, number])[]];

export default class MonoLightServiceHost extends JDServiceHost {
    readonly steps: JDRegisterHost<MonoLightStepsType>;
    readonly brightness: JDRegisterHost<[number]>;
    readonly maxPower: JDRegisterHost<[number]>;
    readonly maxSteps: JDRegisterHost<[number]>;
    readonly currentIteration: JDRegisterHost<[number]>;
    readonly maxIterations: JDRegisterHost<[number]>;

    private _currentStep: number;
    private _currentStepStartTime: number;
    private _currentItensity: number;

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

        this._currentStep = 0;
        this._currentStepStartTime = 0;
        this._currentItensity = 0;

        this.steps.on(REPORT_UPDATE, this.handleSteps.bind(this));
        this.on(REFRESH, this.handleRefresh.bind(this));
    }

    get intensity() {
        const [brightness] = this.brightness.values();
        return (this._currentItensity * brightness) / (0xffff * 0xffff);
    }

    private handleSteps() {
        // drop extras steps
        const [maxSteps] = this.maxSteps.values();
        const [steps] = this.steps.values();
        if (steps.length > maxSteps)
            this.steps.setValues([steps.slice(0, maxSteps)], false);
        // reset counter
        this.currentIteration.setValues([0])
        // reset timer
        this._currentStep = 0;
        this._currentStepStartTime = this.device.bus.timestamp;
    }

    private handleRefresh() {
        // check iteration count
        const [currentIteration] = this.currentIteration.values();
        const [maxIterations] = this.maxIterations.values();

        if (currentIteration > maxIterations)
            return;

        // don't animate when brightness is 0
        const [brightness] = this.brightness.values();
        if (brightness == 0)
            return;

        // grab current step
        const [steps] = this.steps.values();
        if (!steps.length) {
            this._currentItensity = 0;
            return;
        }

        // find the step we are in
        const now = this.device.bus.timestamp;
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

        // save new iteration
        if (iteration !== currentIteration)
            this.currentIteration.setValues([iteration]);

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
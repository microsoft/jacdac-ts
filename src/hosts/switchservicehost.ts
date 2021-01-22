import { SRV_SWITCH, SwitchEvent, SwitchReg, SwitchVariant } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDSensorServiceHost from "./sensorservicehost";

export default class SwitchServiceHost extends JDSensorServiceHost<[boolean]> {
    readonly variant: JDRegisterHost<[SwitchVariant]>;
    readonly autoOffDelay: JDRegisterHost<[number]>;
    private autoOffInterval: any;

    constructor(options?: { autoOffDelay?: number, variant?: SwitchVariant }) {
        super(SRV_SWITCH, { readingValues: [false], streamingInterval: 50 });
        const { autoOffDelay, variant } = options || {};

        this.variant = this.addRegister(SwitchReg.Variant, variant !== undefined ? [variant] : undefined)
        this.autoOffDelay = this.addRegister(SwitchReg.AutoOffDelay, autoOffDelay !== undefined ? [autoOffDelay] : undefined);
    }

    async toggle() {
        const [v] = this.reading.values();
        if (!v)
            await this.switchOn();
        else
            await this.switchOff();
    }

    async switchOn() {
        const [v] = this.reading.values();
        if (!v) {
            this.reading.setValues([true]);
            await this.sendEvent(SwitchEvent.On);
            this.startAutoOff();
        }
    }

    async switchOff() {
        const [v] = this.reading.values();
        if (v) {
            this.reading.setValues([false]);
            await this.sendEvent(SwitchEvent.Off);
            this.stopAutoOff();
        }
    }

    private startAutoOff() {
        this.stopAutoOff();
        if (this.autoOffDelay.data !== undefined) {
            const [delay] = this.autoOffDelay.values();
            this.autoOffInterval = setTimeout(this.switchOn.bind(this), delay);
        }
    }

    private stopAutoOff() {
        if (this.autoOffInterval) {
            clearTimeout(this.autoOffInterval)
            this.autoOffInterval = undefined;
        }
    }
}
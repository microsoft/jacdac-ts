import { SRV_SWITCH, SwitchEvent, SwitchReg, SwitchVariant } from "../jdom/constants";
import RegisterHost from "../jdom/registerhost";
import SensorServiceHost from "./sensorservicehost";

export default class SwitchServiceHost extends SensorServiceHost<[boolean]> {
    readonly variant: RegisterHost<[SwitchVariant]>;
    readonly autoOffDelay: RegisterHost<[number]>;
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
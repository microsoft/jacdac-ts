import { ButtonEvent, REFRESH, SRV_BUTTON } from "../jdom/constants";
import SensorServiceHost from "./sensorservicehost";

const LONG_CLICK_DELAY = 500
const CLICK_DELAY = 100
const HOLD_DELAY = 1500

export default class ButtonServiceHost extends SensorServiceHost<[boolean]> {
    private _downTime: number;
    private _held: boolean;

    constructor() {
        super(SRV_BUTTON, { readingValues: [false], streamingInterval: 50 });
        this._downTime = undefined;
        this._held = false;

        this.on(REFRESH, this.handleRefresh.bind(this));
    }

    private async handleRefresh() {
        const [v] = this.reading.values();
        if (v && !this._held && this.device.bus.timestamp - this._downTime > HOLD_DELAY) {
            this._held = true;
            await this.sendEvent(ButtonEvent.Hold);
        }
    }

    async down() {
        const [v] = this.reading.values();
        if (v) return;
        this._downTime = this.device.bus.timestamp;
        this._held = false;
        this.reading.setValues([true]);
        await this.sendEvent(ButtonEvent.Down);
    }

    async up() {
        const [v] = this.reading.values();
        if (!v) return;
        const upTime = this.device.bus.timestamp;
        this.reading.setValues([false]);
        await this.sendEvent(ButtonEvent.Up);

        // generate clicks
        if (this._downTime !== undefined) {
            const dt = upTime - this._downTime;
            this._downTime = undefined;
            if (dt > LONG_CLICK_DELAY)
                await this.sendEvent(ButtonEvent.LongClick);
            else if (dt > CLICK_DELAY)
                await this.sendEvent(ButtonEvent.Click);
        }
    }
}
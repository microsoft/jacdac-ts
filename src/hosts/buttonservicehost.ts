import { ButtonEvent, REFRESH, SRV_BUTTON } from "../jdom/constants";
import SensorServiceHost from "./sensorservicehost";

const CLICK_HOLD_TIME = 500

export default class ButtonServiceHost extends SensorServiceHost<[boolean]> {
    private _downTime: number;
    private _held = false;

    constructor(instanceName?: string) {
        super(SRV_BUTTON, { instanceName, readingValues: [false], streamingInterval: 50 });
        this.on(REFRESH, this.handleRefresh.bind(this));
    }

    private async handleRefresh() {
        const [v] = this.reading.values();
        if (v) {
            const delay = this.device.bus.timestamp - this._downTime;
            if (!this._held && delay > CLICK_HOLD_TIME) {
                this._held = true;
                await this.sendEvent(ButtonEvent.Hold);
            }
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
            if (upTime - this._downTime < CLICK_HOLD_TIME)
                await this.sendEvent(ButtonEvent.Click);
        }
    }
}
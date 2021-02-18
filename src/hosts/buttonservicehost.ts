import { ButtonEvent, REFRESH, SRV_BUTTON } from "../jdom/constants";
import SensorServiceHost from "./sensorservicehost";

const LONG_CLICK_DELAY = 500
const HOLD_DELAY = 1500

export default class ButtonServiceHost extends SensorServiceHost<[boolean]> {
    private _downTime: number;
    private _held = false;
    private _longClick = false;

    constructor(instanceName?: string) {
        super(SRV_BUTTON, { instanceName, readingValues: [false], streamingInterval: 50 });
        this.on(REFRESH, this.handleRefresh.bind(this));
    }

    private async handleRefresh() {
        const [v] = this.reading.values();
        if (v) {
            const delay = this.device.bus.timestamp - this._downTime;
            if (!this._longClick && delay > LONG_CLICK_DELAY) {
                this._longClick = true;
                await this.sendEvent(ButtonEvent.LongClick);
            }
            if (!this._held && delay > HOLD_DELAY) {
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
        this._longClick = false;
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
            if (!this._longClick)
                await this.sendEvent(ButtonEvent.Click);
        }
    }
}
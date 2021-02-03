import { ButtonEvent, SRV_BUTTON } from "../jdom/constants";
import JDSensorServiceHost from "./sensorservicehost";

const LONG_CLICK_DELAY = 500
const CLICK_DELAY = 100

export default class ButtonServiceHost extends JDSensorServiceHost<[boolean]> {
    private _downTime: number;

    constructor() {
        super(SRV_BUTTON, { readingValues: [false], streamingInterval: 50 });
        this._downTime = undefined;
    }

    async down() {
        const [v] = this.reading.values();
        if (!v) {
            this._downTime = this.device.bus.timestamp;
            this.reading.setValues([true]);
            await this.sendEvent(ButtonEvent.Down);
        }
    }

    async up() {
        const [v] = this.reading.values();
        if (v) {
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
}
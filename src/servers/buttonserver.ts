import { ButtonEvent, REFRESH, SRV_BUTTON } from "../jdom/constants";
import SensorServer from "./sensorserver";

const HOLD_TIME = 500

export default class ButtonServer extends SensorServer<[boolean]> {
    private _downTime: number;
    private _nextHold: number;

    constructor(instanceName?: string) {
        super(SRV_BUTTON, { instanceName, readingValues: [false], streamingInterval: 50 });
        this.on(REFRESH, this.handleRefresh.bind(this));
    }

    private async handleRefresh() {
        const [v] = this.reading.values();
        if (v) {
            if (this.device.bus.timestamp  > this._nextHold) {
                this._nextHold = this.device.bus.timestamp + HOLD_TIME;
                await this.sendEvent(ButtonEvent.Hold);
            }
        }
    }

    async down() {
        const [v] = this.reading.values();
        if (v) return;
        this._downTime = this.device.bus.timestamp;
        this._nextHold = this._downTime + HOLD_TIME;
        this.reading.setValues([true]);
        await this.sendEvent(ButtonEvent.Down);
    }

    async up() {
        const [v] = this.reading.values();
        if (!v) return;
        this.reading.setValues([false]);
        await this.sendEvent(ButtonEvent.Up);
    }
}
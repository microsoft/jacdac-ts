import { JDClient } from "../jdom/client";
import { CHANGE, REPORT_UPDATE, SystemEvent, SystemReadingThreshold, SystemReg } from "../jdom/constants";
import JDAnalogSensorServiceHost from "./analogsensorservicehost";
import SensorServiceHost from "./sensorservicehost";

export class LevelDetector extends JDClient {
    private _state: number;

    constructor(readonly service: JDAnalogSensorServiceHost) {
        super();
        this.reset();
        if (this.service.lowThreshold)
            this.mount(this.service.lowThreshold.subscribe(CHANGE, this.reset.bind(this)));
        if (this.service.highThreshold)
            this.mount(this.service.highThreshold.subscribe(CHANGE, this.reset.bind(this)));
        this.mount(this.service.reading.subscribe(CHANGE, this.update.bind(this)));
    }

    reset() {
        this._state = SystemReadingThreshold.Neutral;
    }

    update() {
        const [level] = this.service.reading.values();
        if (level === undefined) {
            this.setState(SystemReadingThreshold.Neutral);
            return;
        }

        const [high] = this.service.highThreshold?.values();
        if (high !== undefined && level >= high) {
            this.setState(SystemReadingThreshold.High);
            return;
        }

        const [low] = this.service.lowThreshold?.values();
        if (low !== undefined && level <= low) {
            this.setState(SystemReadingThreshold.Low);
            return;
        }

        // neutral
        this.setState(SystemReadingThreshold.Neutral);
    }

    private setState(state: number) {
        if (state === this._state)
            return;

        const now = this.service.device.bus.timestamp;
        this._state = state;
        switch (state) {
            case SystemReadingThreshold.High:
                this.service.sendEvent(SystemEvent.High)
                break;
            case SystemReadingThreshold.Low:
                this.service.sendEvent(SystemEvent.Low)
                break;
            case SystemReadingThreshold.Neutral:
                this.service.sendEvent(SystemEvent.Neutral)
                break;
        }
    }
}
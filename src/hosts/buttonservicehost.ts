import { ButtonEvent, SRV_BUTTON } from "../jdom/constants";
import JDSensorServiceHost from "./sensorservicehost";
import { delay } from "../jdom/utils";

export default class ButtonServiceHost extends JDSensorServiceHost<boolean> {
    constructor() {
        super(SRV_BUTTON, { readingValues: [false], streamingInterval: 50 });
    }

    async down() {
        const [v] = this.reading.values();
        if (!v) {
            this.reading.setValues([true]);
            await this.sendEvent(ButtonEvent.Down);
        }
    }

    async up() {
        const [v] = this.reading.values();
        if (v) {
            this.reading.setValues([false]);
            await this.sendEvent(ButtonEvent.Up);
        }
    }

    async click() {
        this.down(); // async event
        await delay(100);
        this.up(); // async event
        this.sendEvent(ButtonEvent.Click);
    }

    async longClick() {
        this.down(); // async event
        await delay(500);
        this.up(); // async event
        this.sendEvent(ButtonEvent.LongClick);
    }
}
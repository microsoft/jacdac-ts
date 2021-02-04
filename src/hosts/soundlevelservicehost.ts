import { SoundLevelReg, SRV_SOUND_LEVEL } from "../jdom/constants";
import RegisterHost from "../jdom/registerhost";
import AnalogSensorServiceHost from "./analogsensorservicehost";

export default class SoundLevelServiceHost extends AnalogSensorServiceHost {
    constructor() {
        super(SRV_SOUND_LEVEL, {
            readingValues: [0],
            lowThreshold: 10,
            highThreshold: 70
        })
    }

    setSoundLevel(value: number) {
        this.reading.setValues([value]);
        this.reading.sendGetAsync();
    }
}
import { SystemReg } from "../../jacdac-spec/dist/specconstants";
import { SensorReg } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export default class JDSensorServiceHost extends JDServiceHost {
    readonly reading: JDRegisterHost;
    readonly streamingSamples: JDRegisterHost;
    readonly streamingInterval: JDRegisterHost;
    private lastStream = 0;

    constructor(public readonly serviceClass: number,
        readingFormat: string,
        readingValue: any[],
        streamingInterval?: number
        ) {
        super(serviceClass);

        this.reading = this.addRegister(SystemReg.Reading, readingFormat, readingValue);
        this.streamingSamples = this.addRegister(SensorReg.StreamingSamples, "u8", [0]);
        this.streamingInterval = this.addRegister(SensorReg.StreamingInterval, "u32", [streamingInterval || 50]);
        if (streamingInterval !== undefined)
            this.addRegister(SensorReg.StreamingPreferredInterval, "u32", [streamingInterval]);
    }

    refreshRegisters() {
        const [samples] = this.streamingSamples.values<[number]>();
        if (samples <= 0)
            return;
        // is it time to stream?
        const [interval] = this.streamingInterval.values<[number]>();
        const now = this.device.bus.timestamp;
        if (now - this.lastStream > interval) {
            // let's stream a value!
            this.lastStream = now;
            this.streamingSamples.setValues([samples - 1]);
            this.reading.sendGetAsync();
        }
    }
}
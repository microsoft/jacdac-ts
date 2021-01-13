import { SystemReg } from "../../jacdac-spec/dist/specconstants";
import { SensorReg } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost, { JDServiceHostOptions } from "../jdom/servicehost";

export interface JDSensorServiceOptions {
    readingValue?: any,
    streamingInterval?: number,
    minReading?: number,
    maxReading?: number
}

export default class JDSensorServiceHost extends JDServiceHost {
    readonly reading: JDRegisterHost;
    readonly streamingSamples: JDRegisterHost;
    readonly streamingInterval: JDRegisterHost;

    readonly readingError: JDRegisterHost;

    private lastStream = 0;

    constructor(
        public readonly serviceClass: number,
        options: JDSensorServiceOptions & JDServiceHostOptions
    ) {
        super(serviceClass, options);
        const { readingValue, streamingInterval, minReading, maxReading } = options || {};

        this.reading = this.addRegister(SystemReg.Reading, readingValue !== undefined ? [readingValue] : undefined);
        this.streamingSamples = this.addRegister(SensorReg.StreamingSamples);
        this.streamingInterval = this.addRegister(SensorReg.StreamingInterval, [streamingInterval || 50]);
        if (streamingInterval !== undefined)
            this.addRegister(SensorReg.StreamingPreferredInterval, [streamingInterval]);

        this.addRegister(SystemReg.ReadingError, [0]);
        if (minReading !== undefined)
            this.addRegister(SystemReg.MinReading, [minReading]);
        if (maxReading !== undefined)
            this.addRegister(SystemReg.MaxReading, [maxReading]);
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
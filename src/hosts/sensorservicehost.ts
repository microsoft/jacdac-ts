import { SystemReg } from "../../jacdac-spec/dist/specconstants";
import { SensorReg } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost, { JDServiceHostOptions } from "../jdom/servicehost";

export interface JDSensorServiceOptions<TReading> {
    readingValue?: TReading,
    streamingInterval?: number,
    minReading?: number,
    maxReading?: number,
    readingError?: number,
}

export default class JDSensorServiceHost<TReading = any> extends JDServiceHost {
    readonly reading: JDRegisterHost<[TReading]>;
    readonly streamingSamples: JDRegisterHost<[number]>;
    readonly streamingInterval: JDRegisterHost<[number]>;

    readonly readingError: JDRegisterHost<[number]>;

    private lastStream = 0;

    constructor(
        public readonly serviceClass: number,
        options?: JDSensorServiceOptions<TReading> & JDServiceHostOptions
    ) {
        super(serviceClass, options);
        const { readingValue, streamingInterval, minReading, maxReading, readingError } = options || {};

        this.reading = this.addRegister<[TReading]>(SystemReg.Reading, readingValue !== undefined ? Array.isArray(readingValue) ? (readingValue as unknown as [TReading]) : [readingValue] : undefined);
        this.streamingSamples = this.addRegister<[number]>(SensorReg.StreamingSamples);
        this.streamingInterval = this.addRegister<[number]>(SensorReg.StreamingInterval, [streamingInterval || 50]);
        if (streamingInterval !== undefined)
            this.addRegister<[number]>(SensorReg.StreamingPreferredInterval, [streamingInterval]);

        this.readingError = this.addRegister<[number]>(SystemReg.ReadingError, [readingError || 0]);
        this.reading.errorRegister = this.readingError;
        if (minReading !== undefined)
            this.addRegister<[number]>(SystemReg.MinReading, [minReading]);
        if (maxReading !== undefined)
            this.addRegister<[number]>(SystemReg.MaxReading, [maxReading]);
    }

    refreshRegisters() {
        const [samples] = this.streamingSamples.values();
        if (samples <= 0 || !this.reading.data)
            return;
        // is it time to stream?
        const [interval] = this.streamingInterval.values();
        const now = this.device.bus.timestamp;
        if (now - this.lastStream > interval) {
            // let's stream a value!
            this.lastStream = now;
            this.streamingSamples.setValues([samples - 1]);
            this.reading.sendGetAsync();
        }
    }
}
import { SystemReg } from "../../jacdac-spec/dist/specconstants";
import { REFRESH, SensorReg } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost, { JDServiceHostOptions } from "../jdom/servicehost";

export interface JDSensorServiceOptions<TReading extends any[]> {
    readingValues?: TReading,
    streamingInterval?: number,
    minReading?: number,
    maxReading?: number,
    readingError?: number,
    lowThreshold?: number,
    highTreshold?: number,
}

export default class JDSensorServiceHost<TReading extends any[]> extends JDServiceHost {
    readonly reading: JDRegisterHost<TReading>;
    readonly streamingSamples: JDRegisterHost<[number]>;
    readonly streamingInterval: JDRegisterHost<[number]>;

    readonly readingError: JDRegisterHost<[number]>;

    private lastStream = 0;

    constructor(
        public readonly serviceClass: number,
        options?: JDSensorServiceOptions<TReading> & JDServiceHostOptions
    ) {
        super(serviceClass, options);
        const { readingValues, streamingInterval, minReading, maxReading, readingError,
            lowThreshold, highTreshold } = options || {};

        this.reading = this.addRegister<TReading>(SystemReg.Reading, readingValues);
        this.streamingSamples = this.addRegister<[number]>(SensorReg.StreamingSamples);
        this.streamingInterval = this.addRegister<[number]>(SensorReg.StreamingInterval, streamingInterval ? [streamingInterval] : undefined);
        if (streamingInterval !== undefined)
            this.addRegister<[number]>(SensorReg.StreamingPreferredInterval, [streamingInterval]);
        if (readingError !== undefined) {
            this.readingError = this.addRegister<[number]>(SystemReg.ReadingError, [readingError || 0]);
            this.reading.errorRegister = this.readingError;
        }
        if (minReading !== undefined)
            this.addRegister<[number]>(SystemReg.MinReading, [minReading]);
        if (maxReading !== undefined)
            this.addRegister<[number]>(SystemReg.MaxReading, [maxReading]);
        if (lowThreshold !== undefined)
            this.addRegister<[number]>(SystemReg.LowThreshold, [lowThreshold]);
        if (highTreshold !== undefined)
            this.addRegister<[number]>(SystemReg.HighThreshold, [highTreshold]);

        this.on(REFRESH, this.refreshRegisters.bind(this));
    }

    private refreshRegisters() {
        const [samples] = this.streamingSamples.values();
        if (samples <= 0 || !this.reading.data)
            return;
        // is it time to stream?
        let [interval] = this.streamingInterval.values();
        if (interval === undefined) // use spec info is needed
            interval = this.streamingInterval.specification.preferredInterval;
        const now = this.device.bus.timestamp;
        if (now - this.lastStream > interval) {
            // let's stream a value!
            this.lastStream = now;
            this.streamingSamples.setValues([samples - 1]);
            this.reading.sendGetAsync();
            this.readingError?.sendGetAsync();
        }
    }
}
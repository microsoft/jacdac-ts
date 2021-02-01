import { SystemReg } from "../../jacdac-spec/dist/specconstants";
import { READING_SENT, REFRESH, REPORT_UPDATE, SensorReg } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost, { JDServiceHostOptions } from "../jdom/servicehost";
import { LevelDetector } from "./leveldetector";

export interface JDSensorServiceOptions<TReading extends any[]> extends JDServiceHostOptions {
    readingValues?: TReading,
    streamingInterval?: number,
};

export default class JDSensorServiceHost<TReading extends any[]> extends JDServiceHost {
    readonly reading: JDRegisterHost<TReading>;
    readonly streamingSamples: JDRegisterHost<[number]>;
    readonly streamingInterval: JDRegisterHost<[number]>;

    private lastStream = 0;

    constructor(
        public readonly serviceClass: number,
        options?: JDSensorServiceOptions<TReading>
    ) {
        super(serviceClass, options);
        const { readingValues, streamingInterval } = options || {};

        this.reading = this.addRegister<TReading>(SystemReg.Reading, readingValues);
        this.streamingSamples = this.addRegister<[number]>(SensorReg.StreamingSamples);
        this.streamingInterval = this.addRegister<[number]>(SensorReg.StreamingInterval, streamingInterval ? [streamingInterval] : undefined);
        if (streamingInterval !== undefined)
            this.addRegister<[number]>(SensorReg.StreamingPreferredInterval, [streamingInterval]);

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
            this.emit(READING_SENT);
        }
    }
}

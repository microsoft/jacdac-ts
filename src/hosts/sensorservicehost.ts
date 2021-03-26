import { SystemReg } from "../../jacdac-spec/dist/specconstants";
import { CHANGE, READING_SENT, REFRESH, SensorReg } from "../jdom/constants";
import { PackedValues } from "../jdom/pack";
import RegisterHost from "../jdom/registerhost";
import ServiceHost, { ServiceHostOptions } from "../jdom/servicehost";

export interface SensorServiceOptions<TReading extends PackedValues> extends ServiceHostOptions {
    readingValues?: TReading,
    readingError?: TReading,
    streamingInterval?: number,
}

export default class SensorServiceHost<TReading extends PackedValues> extends ServiceHost {
    readonly reading: RegisterHost<TReading>;
    readonly readingError: RegisterHost<TReading>;
    readonly streamingSamples: RegisterHost<[number]>;
    readonly streamingInterval: RegisterHost<[number]>;

    private lastStream = 0;
    private lastErrorReadingChanged = false;

    constructor(
        public readonly serviceClass: number,
        options?: SensorServiceOptions<TReading>
    ) {
        super(serviceClass, options);
        const { readingValues, streamingInterval, readingError } = options || {};

        this.reading = this.addRegister<TReading>(SystemReg.Reading, readingValues);
        this.streamingSamples = this.addRegister<[number]>(SensorReg.StreamingSamples);
        this.streamingInterval = this.addRegister<[number]>(SensorReg.StreamingInterval, [streamingInterval || 50]);
        if (streamingInterval !== undefined)
            this.addRegister<[number]>(SensorReg.StreamingPreferredInterval, [streamingInterval]);
        if (readingError !== undefined) {
            this.readingError = this.addRegister<TReading>(SystemReg.ReadingError, readingError);
            this.reading.errorRegister = this.readingError;
            this.readingError.on(CHANGE, () => this.lastErrorReadingChanged = true)
        }

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

            // if the error changed, send value as well.
            if (this.lastErrorReadingChanged) {
                this.readingError?.sendGetAsync();
                this.lastErrorReadingChanged = false;
            }
        }
    }
}

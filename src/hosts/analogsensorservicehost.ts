import { ServiceHostOptions, SystemReg, READING_SENT } from "../jacdac";
import RegisterHost from "../jdom/registerhost";
import { LevelDetector } from "./leveldetector";
import SensorServiceHost, { SensorServiceOptions } from "./sensorservicehost";

export interface AnalogSensorServiceHostOptions extends SensorServiceOptions<[number]> {
    minReading?: number,
    maxReading?: number,
    readingError?: number,
    lowThreshold?: number,
    highThreshold?: number,
    readingResolution?: number,
}

export default class AnalogSensorServiceHost extends SensorServiceHost<[number]> {
    readonly readingError: RegisterHost<[number]>;
    readonly lowThreshold: RegisterHost<[number]>;
    readonly highThreshold: RegisterHost<[number]>;
    readonly levelDetector: LevelDetector;

    constructor(serviceClass: number, options: AnalogSensorServiceHostOptions) {
        super(serviceClass, options)
        const { minReading, maxReading, readingError,
            lowThreshold, highThreshold, readingResolution } = options || {};
        if (readingError !== undefined) {
            this.readingError = this.addRegister<[number]>(SystemReg.ReadingError, [readingError || 0]);
            this.reading.errorRegister = this.readingError;
        }
        if (minReading !== undefined)
            this.addRegister<[number]>(SystemReg.MinReading, [minReading]);
        if (maxReading !== undefined)
            this.addRegister<[number]>(SystemReg.MaxReading, [maxReading]);
        if (readingResolution !== undefined)
            this.addRegister<[number]>(SystemReg.ReadingResolution, [readingResolution]);
        if (lowThreshold !== undefined || this.highThreshold !== undefined) {
            if (lowThreshold !== undefined)
                this.lowThreshold = this.addRegister<[number]>(SystemReg.LowThreshold, [lowThreshold]);
            if (highThreshold !== undefined)
                this.highThreshold = this.addRegister<[number]>(SystemReg.HighThreshold, [highThreshold]);
            this.levelDetector = new LevelDetector(this)
        }
        this.on(READING_SENT, this.handleReadingSent.bind(this));
    }

    private handleReadingSent() {
        this.readingError?.sendGetAsync();
    }
}
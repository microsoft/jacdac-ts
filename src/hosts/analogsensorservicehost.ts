import { JDServiceHostOptions, SystemReg, READING_SENT } from "../jacdac";
import JDRegisterHost from "../jdom/registerhost";
import { LevelDetector } from "./leveldetector";
import JDSensorServiceHost, { JDSensorServiceOptions } from "./sensorservicehost";

export interface JDAnalogSensorServiceHostOptions extends JDSensorServiceOptions<[number]> {
    minReading?: number,
    maxReading?: number,
    lowThreshold?: number,
    highThreshold?: number,
}

export default class JDAnalogSensorServiceHost extends JDSensorServiceHost<[number]> {
    readonly readingError: JDRegisterHost<[number]>;
    readonly lowThreshold: JDRegisterHost<[number]>;
    readonly highThreshold: JDRegisterHost<[number]>;
    readonly levelDetector: LevelDetector;

    constructor(serviceClass: number, options: JDAnalogSensorServiceHostOptions) {
        super(serviceClass, options)
        const { minReading, maxReading, readingError,
            lowThreshold, highThreshold } = options || {};
        if (readingError !== undefined) {
            this.readingError = this.addRegister<[number]>(SystemReg.ReadingError, [readingError || 0]);
            this.reading.errorRegister = this.readingError;
        }
        if (minReading !== undefined)
            this.addRegister<[number]>(SystemReg.MinReading, [minReading]);
        if (maxReading !== undefined)
            this.addRegister<[number]>(SystemReg.MaxReading, [maxReading]);
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
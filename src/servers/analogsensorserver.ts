import { SystemReg } from "../jdom/constants"
import JDRegisterServer from "../jdom/registerserver"
import { LevelDetector } from "./leveldetector"
import SensorServer, { SensorServiceOptions } from "./sensorserver"

export interface AnalogSensorServerOptions
    extends SensorServiceOptions<[number]> {
    minReading?: number
    maxReading?: number
    lowThreshold?: number
    highThreshold?: number
    readingResolution?: number
}

export default class AnalogSensorServer extends SensorServer<
    [number]
> {
    readonly lowThreshold: JDRegisterServer<[number]>
    readonly highThreshold: JDRegisterServer<[number]>
    readonly levelDetector: LevelDetector

    constructor(
        serviceClass: number,
        options?: AnalogSensorServerOptions
    ) {
        super(serviceClass, options)
        const {
            minReading,
            maxReading,
            lowThreshold,
            highThreshold,
            readingResolution,
        } = options || {}
        if (minReading !== undefined)
            this.addRegister<[number]>(SystemReg.MinReading, [minReading])
        if (maxReading !== undefined)
            this.addRegister<[number]>(SystemReg.MaxReading, [maxReading])
        if (readingResolution !== undefined)
            this.addRegister<[number]>(SystemReg.ReadingResolution, [
                readingResolution,
            ])
        if (lowThreshold !== undefined || this.highThreshold !== undefined) {
            if (lowThreshold !== undefined)
                this.lowThreshold = this.addRegister<[number]>(
                    SystemReg.LowThreshold,
                    [lowThreshold]
                )
            if (highThreshold !== undefined)
                this.highThreshold = this.addRegister<[number]>(
                    SystemReg.HighThreshold,
                    [highThreshold]
                )
            this.levelDetector = new LevelDetector(this)
        }
    }
}

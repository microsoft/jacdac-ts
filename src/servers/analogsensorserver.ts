import { SystemReg } from "../jdom/constants"
import JDRegisterServer from "../jdom/registerserver"
import { LevelDetector } from "./leveldetector"
import SensorServer, { SensorServiceOptions } from "./sensorserver"

export interface AnalogSensorServerOptions
    extends SensorServiceOptions<[number]> {
    minReading?: number
    maxReading?: number
    inactiveThreshold?: number
    activeThreshold?: number
    readingResolution?: number
}

export default class AnalogSensorServer extends SensorServer<[number]> {
    readonly inactiveThreshold: JDRegisterServer<[number]>
    readonly activeThreshold: JDRegisterServer<[number]>
    readonly levelDetector: LevelDetector

    constructor(serviceClass: number, options?: AnalogSensorServerOptions) {
        super(serviceClass, options)
        const {
            minReading,
            maxReading,
            inactiveThreshold,
            activeThreshold,
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
        if (
            inactiveThreshold !== undefined ||
            this.activeThreshold !== undefined
        ) {
            if (inactiveThreshold !== undefined)
                this.inactiveThreshold = this.addRegister<[number]>(
                    SystemReg.InactiveThreshold,
                    [inactiveThreshold]
                )
            if (activeThreshold !== undefined)
                this.activeThreshold = this.addRegister<[number]>(
                    SystemReg.ActiveThreshold,
                    [activeThreshold]
                )
            this.levelDetector = new LevelDetector(this)
        }
    }
}

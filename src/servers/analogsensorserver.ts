import { SystemReg } from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { LevelDetector } from "./leveldetector"
import { JDSensorServer, JDSensorServiceOptions } from "./sensorserver"

/**
 * Creation options for AnalogSensorServer
 * @category Servers
 * @internal
 */
export interface JDAnalogSensorServerOptions
    extends JDSensorServiceOptions<[number]> {
    minReading?: number
    maxReading?: number
    inactiveThreshold?: number
    activeThreshold?: number
    readingResolution?: number
}

/**
 * Base class for analog sensor servers
 * @category Servers
 */
export class JDAnalogSensorServer extends JDSensorServer<[number]> {
    readonly inactiveThreshold: JDRegisterServer<[number]>
    readonly activeThreshold: JDRegisterServer<[number]>
    readonly levelDetector: LevelDetector

    constructor(serviceClass: number, options?: JDAnalogSensorServerOptions) {
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

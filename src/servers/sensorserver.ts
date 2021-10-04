import { SystemReg } from "../../jacdac-spec/dist/specconstants"
import {
    CHANGE,
    READING_SENT,
    REFRESH,
    SensorReg,
    STREAMING_DEFAULT_INTERVAL,
} from "../jdom/constants"
import { PackedValues } from "../jdom/pack"
import JDRegisterServer from "../jdom/servers/registerserver"
import JDServiceServer, { JDServerOptions } from "../jdom/servers/serviceserver"

/**
 * Creation options for sensor servers
 * @category Servers
 * @internal
 */
export interface SensorServiceOptions<TReading extends PackedValues>
    extends JDServerOptions {
    readingValues?: TReading
    readingError?: TReading
    streamingInterval?: number
    preferredStreamingInterval?: number
}

export default class SensorServer<
    TReading extends PackedValues
> extends JDServiceServer {
    readonly reading: JDRegisterServer<TReading>
    readonly readingError: JDRegisterServer<TReading>
    readonly streamingSamples: JDRegisterServer<[number]>
    readonly streamingInterval: JDRegisterServer<[number]>
    readonly preferredStreamingInterval: JDRegisterServer<[number]>

    private lastStream = 0
    private lastErrorReadingChanged = false

    constructor(
        public readonly serviceClass: number,
        options?: SensorServiceOptions<TReading>
    ) {
        super(serviceClass, options)
        const {
            readingValues,
            streamingInterval,
            preferredStreamingInterval,
            readingError,
        } = options || {}

        this.reading = this.addRegister<TReading>(
            SystemReg.Reading,
            readingValues
        )
        this.streamingSamples = this.addRegister<[number]>(
            SensorReg.StreamingSamples
        )
        if (streamingInterval !== undefined)
            this.streamingInterval = this.addRegister<[number]>(
                SensorReg.StreamingInterval,
                [streamingInterval]
            )
        if (preferredStreamingInterval !== undefined)
            this.preferredStreamingInterval = this.addRegister<[number]>(
                SensorReg.StreamingPreferredInterval,
                [preferredStreamingInterval]
            )
        if (readingError !== undefined) {
            this.readingError = this.addRegister<TReading>(
                SystemReg.ReadingError,
                readingError
            )
            this.reading.errorRegister = this.readingError
            this.readingError.on(
                CHANGE,
                () => (this.lastErrorReadingChanged = true)
            )
        }

        this.on(REFRESH, this.refreshRegisters.bind(this))
    }

    private refreshRegisters() {
        const [samples] = this.streamingSamples.values()
        if (samples <= 0 || !this.reading.data) return
        // is it time to stream?
        let interval = this.streamingInterval?.values()?.[0]
        if (interval === undefined)
            interval = this.preferredStreamingInterval?.values()?.[0]
        if (interval === undefined)
            interval = this.reading.specification.preferredInterval
        if (interval === undefined) interval = STREAMING_DEFAULT_INTERVAL

        const now = this.device.bus.timestamp
        if (now - this.lastStream > interval) {
            // let's stream a value!
            this.lastStream = now
            this.streamingSamples.setValues([samples - 1])
            this.reading.sendGetAsync()
            this.emit(READING_SENT)

            // if the error changed, send value as well.
            if (this.lastErrorReadingChanged) {
                this.readingError?.sendGetAsync()
                this.lastErrorReadingChanged = false
            }
        }
    }
}

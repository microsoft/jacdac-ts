import JDBus from "../bus"
import JDEventSource from "../eventsource"
import { shortDeviceId } from "../pretty"
import { anyRandomUint32 } from "../random"
import { toHex } from "../utils"

/**
 * Implements a device with service servers.
 * @category Servers
 */
export abstract class JDServiceProvider extends JDEventSource {
    private _bus: JDBus
    public readonly deviceId: string
    public readonly shortId: string

    constructor(deviceId?: string) {
        super()
        this.deviceId = deviceId
        if (!this.deviceId) {
            const devId = anyRandomUint32(8)
            for (let i = 0; i < 8; ++i) devId[i] &= 0xff
            this.deviceId = toHex(devId)
        }
        this.shortId = shortDeviceId(this.deviceId)
    }

    get bus() {
        return this._bus
    }

    set bus(value: JDBus) {
        if (value !== this._bus) {
            this.internalStop()
            this._bus = value
            if (this._bus) this.internalStart()
        }
    }

    private internalStart() {
        if (!this._bus) return
        this.start()
    }

    protected abstract start(): void

    private internalStop() {
        if (!this._bus) return
        this.stop()
    }

    protected abstract stop(): void
}
export default JDServiceProvider

import JDBus from "../bus"
import { PACKET_PROCESS, PACKET_SEND, SELF_ANNOUNCE } from "../constants"
import JDEventSource from "../eventsource"
import Packet from "../packet"
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
        this.handleSelfAnnounce = this.handleSelfAnnounce.bind(this)
        this.handlePacket = this.handlePacket.bind(this)
    }

    get bus() {
        return this._bus
    }

    set bus(value: JDBus) {
        if (value !== this._bus) {
            this.stop()
            this._bus = value
            if (this._bus) this.start()
        }
    }

    protected start() {
        if (this._bus) {
            this._bus.on(SELF_ANNOUNCE, this.handleSelfAnnounce)
            this._bus.on([PACKET_PROCESS, PACKET_SEND], this.handlePacket)
        }
    }

    protected stop() {
        if (this._bus) {
            this._bus.off(SELF_ANNOUNCE, this.handleSelfAnnounce)
            this._bus.off([PACKET_PROCESS, PACKET_SEND], this.handlePacket)
            this._bus = undefined
        }
    }

    protected handleSelfAnnounce(): void {}
    protected abstract handlePacket(pkt: Packet): void
}
export default JDServiceProvider

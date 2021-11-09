import JDBus from "../bus"
import { PACKET_PROCESS, PACKET_SEND, SELF_ANNOUNCE } from "../constants"
import JDEventSource from "../eventsource"
import Packet from "../packet"
import { shortDeviceId } from "../pretty"
import { randomDeviceId } from "../random"
import JDServiceServer from "./serviceserver"

/**
 * Implements a device with service servers.
 * @category Servers
 */
export abstract class JDServiceProvider extends JDEventSource {
    private _bus: JDBus
    public readonly template: string
    public readonly deviceId: string
    public readonly shortId: string

    constructor(template: string, deviceId?: string) {
        super()
        this.template = template
        this.deviceId = deviceId
        if (!this.deviceId) this.deviceId = randomDeviceId()
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

    abstract service(serviceIndex: number): JDServiceServer

    protected handleSelfAnnounce(): void {}
    protected abstract handlePacket(pkt: Packet): void
}
export default JDServiceProvider

import JDServiceServer from "./serviceserver"
import Packet from "../packet"
import { isBufferEmpty } from "../utils"
import ControlServer from "./controlserver"
import {
    CHANGE,
    CMD_EVENT_COUNTER_MASK,
    CMD_EVENT_COUNTER_POS,
    CMD_EVENT_MASK,
    ERROR,
    JD_SERVICE_INDEX_CRC_ACK,
    MAX_SERVICES_LENGTH,
    REFRESH,
    RESET,
} from "../constants"
import JDServiceProvider from "./serviceprovider"

/**
 * Implements a device with service servers.
 * @category Servers
 */
export class JDServerServiceProvider extends JDServiceProvider {
    private _services: JDServiceServer[]
    public readonly controlService: ControlServer
    private _restartCounter = 0
    private _packetCount = 0
    private _eventCounter: number = undefined
    private _delayedPackets: {
        timestamp: number
        pkt: Packet
    }[]

    constructor(
        template: string,
        services: JDServiceServer[],
        options?: {
            deviceId?: string
            resetIn?: boolean
        }
    ) {
        super(template, options?.deviceId)
        this.controlService = new ControlServer(options)
        this._services = []
        this.updateServices(services)

        this.on(REFRESH, this.refreshRegisters.bind(this))
    }

    updateServices(services: JDServiceServer[]) {
        // clear previous services
        this._services?.slice(1).forEach(srv => (srv.device = undefined))
        // store new services
        this._services = [this.controlService, ...services]
        if (this._services.length >= MAX_SERVICES_LENGTH) {
            this.emit(
                ERROR,
                `too many services (${this._services.length}) > ${MAX_SERVICES_LENGTH}`
            )
            console.warn(`jacdac: dropping services to ${MAX_SERVICES_LENGTH}`)
            this._services = this._services.slice(0, MAX_SERVICES_LENGTH)
        }
        this._services.forEach((srv, i) => {
            srv.device = this
            srv.serviceIndex = i
        })
        this.emit(CHANGE)
    }

    removeService(service: JDServiceServer) {
        if (service?.device !== this) return // not in this device;
        const newServices = this._services.slice(1)
        const index = newServices.indexOf(service)
        if (index > -1) {
            newServices.splice(index, 1)
            this.updateServices(newServices)
        }
    }

    protected start() {
        super.start()
        this._packetCount = 0
    }

    protected stop() {
        this._delayedPackets = undefined
        super.stop()
    }

    protected handleSelfAnnounce() {
        super.handleSelfAnnounce()
        if (this._restartCounter < 0xf) this._restartCounter++
        // async
        this.controlService.announce()
        // also send status codes, for non-zero codes
        const activeServices = this.services().filter(
            srv => !isBufferEmpty(srv.statusCode.data)
        )
        activeServices.forEach(srv => srv.statusCode.sendGetAsync())

        // reset counter
        this._packetCount = 0
    }

    get restartCounter() {
        return this._restartCounter
    }

    get packetCount() {
        return this._packetCount
    }

    services(): JDServiceServer[] {
        return this._services.slice(0)
    }

    service(serviceIndex: number) {
        return serviceIndex !== undefined && this._services[serviceIndex]
    }

    toString() {
        return `host ${this.shortId}`
    }

    get eventCounter() {
        return this._eventCounter
    }

    createEventCmd(evCode: number) {
        if (!this._eventCounter) this._eventCounter = 0
        this._eventCounter = (this._eventCounter + 1) & CMD_EVENT_COUNTER_MASK
        if (evCode >> 8) throw new Error("invalid event code")
        return (
            CMD_EVENT_MASK |
            (this._eventCounter << CMD_EVENT_COUNTER_POS) |
            evCode
        )
    }

    async sendPacketAsync(pkt: Packet) {
        if (!this.bus) return Promise.resolve()

        // qos counter
        this._packetCount++

        pkt.deviceIdentifier = this.deviceId
        // compute crc and send
        const p = pkt.sendCoreAsync(this.bus)
        // send to current bus
        this.bus.processPacket(pkt)
        // return priomise
        return p
    }

    delayedSend(pkt: Packet, timestamp: number) {
        if (!this._delayedPackets) {
            this._delayedPackets = []
            // start processing loop
            setTimeout(this.processDelayedPackets.bind(this), 10)
        }
        const dp = { timestamp, pkt }
        this._delayedPackets.push(dp)
        this._delayedPackets.sort((l, r) => -l.timestamp + r.timestamp)
    }

    private processDelayedPackets() {
        // consume packets that are ready
        while (this._delayedPackets?.length) {
            const { timestamp, pkt } = this._delayedPackets[0]
            if (timestamp > this.bus.timestamp) break
            this._delayedPackets.shift()
            // do we wait?
            try {
                this.sendPacketAsync(pkt)
            } catch (e) {
                // something went wrong, clear queue
                this._delayedPackets = undefined
                throw e
            }
        }
        // keep waiting or stop
        if (!this._delayedPackets?.length) this._delayedPackets = undefined
        // we're done
        else setTimeout(this.processDelayedPackets.bind(this), 10)
    }

    protected handlePacket(pkt: Packet) {
        const devIdMatch = pkt.deviceIdentifier == this.deviceId
        if (pkt.requiresAck && devIdMatch) {
            pkt.requiresAck = false // make sure we only do it once
            const crc = pkt.crc
            const ack = Packet.onlyHeader(crc)
            ack.serviceIndex = JD_SERVICE_INDEX_CRC_ACK
            this.sendPacketAsync(ack)
        }

        if (pkt.isMultiCommand) {
            if (!pkt.isCommand) return // only commands supported
            const multiCommandClass = pkt.serviceClass
            for (const h of this._services) {
                if (h.serviceClass == multiCommandClass) {
                    // pretend it's directly addressed to us
                    pkt.deviceIdentifier = this.deviceId
                    pkt.serviceIndex = h.serviceIndex
                    h.handlePacket(pkt)
                }
            }
        } else if (devIdMatch) {
            if (!pkt.isCommand) return // huh? someone's pretending to be us?
            const h = this._services[pkt.serviceIndex]
            if (h) {
                // log(`handle pkt at ${h.name} cmd=${pkt.service_command}`)
                h.handlePacket(pkt)
            }
        } else {
            if (pkt.isCommand) return // it's a command, and it's not for us
            // reception of ACKs is handled by JDDevice class
        }
    }

    private refreshRegisters() {
        this._services.forEach(srv => srv.emit(REFRESH))
    }

    reset() {
        this._restartCounter = 0
        this._packetCount = 0
        this._services?.forEach(srv => srv.reset())
        this.emit(RESET)
    }
}
export default JDServerServiceProvider

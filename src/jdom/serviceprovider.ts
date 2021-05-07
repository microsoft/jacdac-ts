import { JDBus } from "./bus"
import JDServiceServer from "./serviceserver"
import Packet from "./packet"
import { shortDeviceId } from "./pretty"
import { isBufferEmpty, toHex } from "./utils"
import ControlServer from "./controlserver"
import { JDEventSource } from "./eventsource"
import {
    CHANGE,
    CMD_EVENT_COUNTER_MASK,
    CMD_EVENT_COUNTER_POS,
    CMD_EVENT_MASK,
    JD_SERVICE_INDEX_CRC_ACK,
    PACKET_PROCESS,
    PACKET_SEND,
    REFRESH,
    REPORT_RECEIVE,
    RESET,
    SELF_ANNOUNCE,
} from "./constants"
import { anyRandomUint32 } from "./random"

export default class JDServiceProvider extends JDEventSource {
    private _bus: JDBus
    private _services: JDServiceServer[]
    public readonly deviceId: string
    public readonly shortId: string
    public readonly controlService: ControlServer
    private _restartCounter = 0
    private _packetCount = 0
    private _eventCounter: number = undefined
    private _delayedPackets: {
        timestamp: number
        pkt: Packet
    }[]

    constructor(
        services: JDServiceServer[],
        options?: {
            deviceId?: string
            resetIn?: boolean
        }
    ) {
        super()
        this.controlService = new ControlServer(options)
        this._services = []
        this.deviceId = options?.deviceId
        if (!this.deviceId) {
            const devId = anyRandomUint32(8)
            for (let i = 0; i < 8; ++i) devId[i] &= 0xff
            this.deviceId = toHex(devId)
        }
        this.shortId = shortDeviceId(this.deviceId)
        this.updateServices(services)
        this.handleSelfAnnounce = this.handleSelfAnnounce.bind(this)
        this.handlePacket = this.handlePacket.bind(this)

        this.on(REFRESH, this.refreshRegisters.bind(this))
    }

    updateServices(services: JDServiceServer[]) {
        // clear previous services
        this._services?.slice(1).forEach(srv => (srv.device = undefined))
        // store new services
        this._services = [this.controlService, ...services]
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

    private start() {
        if (!this._bus) return

        this._packetCount = 0
        this._bus.on(SELF_ANNOUNCE, this.handleSelfAnnounce)
        this._bus.on([PACKET_PROCESS, PACKET_SEND], this.handlePacket)
        console.debug(`start host`)
    }

    private stop() {
        this._delayedPackets = undefined
        this.clearResetTimer()
        if (!this._bus) return

        this._bus.off(SELF_ANNOUNCE, this.handleSelfAnnounce)
        this._bus.off([PACKET_PROCESS, PACKET_SEND], this.handlePacket)
        console.debug(`stop host`)
        this._bus = undefined
    }

    private handleSelfAnnounce() {
        if (this._restartCounter < 0xf) this._restartCounter++

        // async
        this.controlService.announce()
        // also send status codes, for non-zero codes
        this.services()
            .filter(srv => !isBufferEmpty(srv.statusCode.data))
            .forEach(srv => srv.statusCode.sendGetAsync())

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
        if (!this._bus) return Promise.resolve()

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

    private handlePacket(pkt: Packet) {
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

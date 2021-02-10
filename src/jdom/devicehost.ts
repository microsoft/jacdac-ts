import { JDBus } from "./bus";
import ServiceHost from "./servicehost";
import Packet from "./packet";
import { shortDeviceId } from "./pretty";
import { anyRandomUint32, isBufferEmpty, toHex } from "./utils";
import ControlServiceHost from "./controlservicehost";
import { JDEventSource } from "./eventsource";
import { CMD_EVENT_COUNTER_MASK, CMD_EVENT_COUNTER_POS, CMD_EVENT_MASK, JD_SERVICE_INDEX_CRC_ACK, PACKET_PROCESS, PACKET_SEND, REFRESH, REPORT_RECEIVE, RESET, SELF_ANNOUNCE } from "./constants";

export default class DeviceHost extends JDEventSource {
    private _bus: JDBus;
    private readonly _services: ServiceHost[];
    public readonly deviceId: string;
    public readonly shortId: string;
    public readonly controlService: ControlServiceHost;
    private _restartCounter = 0;
    private _resetTimeOut: any;
    private _packetCount = 0;
    private _eventCounter: number = undefined;
    private _delayedPackets: {
        timestamp: number,
        pkt: Packet
    }[];

    constructor(services: ServiceHost[], options?: {
        deviceId?: string;
    }) {
        super();
        this._services = [this.controlService = new ControlServiceHost(), ...services];
        this.deviceId = options?.deviceId;
        if (!this.deviceId) {
            const devId = anyRandomUint32(8);
            for (let i = 0; i < 8; ++i) devId[i] &= 0xff;
            this.deviceId = toHex(devId);
        }
        this.shortId = shortDeviceId(this.deviceId);
        this._services.forEach((srv, i) => {
            srv.device = this;
            srv.serviceIndex = i;
        });
        this.handleSelfAnnounce = this.handleSelfAnnounce.bind(this);
        this.handlePacket = this.handlePacket.bind(this);

        this.controlService.resetIn.on(REPORT_RECEIVE, this.handleResetIn.bind(this));
        this.on(REFRESH, this.refreshRegisters.bind(this));
    }

    protected log(msg: any) {
        console.log(`${this.shortId}: ${msg}`);
    }

    get bus() {
        return this._bus;
    }

    set bus(value: JDBus) {
        if (value !== this._bus) {
            this.stop();
            this._bus = value;
            if (this._bus)
                this.start();
        }
    }

    private start() {
        if (!this._bus) return;

        this._packetCount = 0;
        this._bus.on(SELF_ANNOUNCE, this.handleSelfAnnounce);
        this._bus.on([PACKET_PROCESS, PACKET_SEND], this.handlePacket)
        this.log(`start host`)
    }

    private stop() {
        this._delayedPackets = undefined;
        this.clearResetTimer();
        if (!this._bus) return;

        this._bus.off(SELF_ANNOUNCE, this.handleSelfAnnounce);
        this._bus.off([PACKET_PROCESS, PACKET_SEND], this.handlePacket)
        this.log(`stop host`)
        this._bus = undefined;
    }

    private handleSelfAnnounce() {
        if (this._restartCounter < 0xf)
            this._restartCounter++

        // async
        this.controlService.announce();
        // also send status codes, for non-zero codes
        this.services()
            .filter(srv => !isBufferEmpty(srv.statusCode.data))
            .forEach(srv => srv.statusCode.sendGetAsync());

        // reset counter
        this._packetCount = 0;
    }

    get restartCounter() {
        return this._restartCounter;
    }

    get packetCount() {
        return this._packetCount;
    }

    services(): ServiceHost[] {
        return this._services.slice(0);
    }

    service(serviceIndex: number) {
        return serviceIndex !== undefined && this._services[serviceIndex];
    }

    toString() {
        return `host ${this.shortId}`;
    }

    get eventCounter() {
        return this._eventCounter;
    }

    createEventCmd(evCode: number) {
        if (!this._eventCounter)
            this._eventCounter = 0
        this._eventCounter = (this._eventCounter + 1) & CMD_EVENT_COUNTER_MASK
        if (evCode >> 8)
            throw new Error("invalid event code")
        return CMD_EVENT_MASK | (this._eventCounter << CMD_EVENT_COUNTER_POS) | evCode
    }

    async sendPacketAsync(pkt: Packet) {
        if (!this._bus)
            return Promise.resolve();

        // qos counter
        this._packetCount++;

        pkt.deviceIdentifier = this.deviceId;
        // compute crc and send
        const p = pkt.sendCoreAsync(this.bus);
        // send to current bus
        this.bus.processPacket(pkt);
        // return priomise
        return p;
    }

    delayedSend(pkt: Packet, timestamp: number) {
        if (!this._delayedPackets) {
            this._delayedPackets = [];
            // start processing loop
            setTimeout(this.processDelayedPackets.bind(this), 10);
        }
        const dp = { timestamp, pkt }
        this._delayedPackets.push(dp);
        this._delayedPackets.sort((l, r) => -l.timestamp + r.timestamp);
    }

    private processDelayedPackets() {
        // consume packets that are ready
        while (this._delayedPackets?.length) {
            const { timestamp, pkt } = this._delayedPackets[0]
            if (timestamp > this.bus.timestamp)
                break;
            this._delayedPackets.shift();
            // do we wait?
            try {
                this.sendPacketAsync(pkt);
            } catch (e) {
                // something went wrong, clear queue
                this._delayedPackets = undefined;
                throw e;
            }
        }
        // keep waiting or stop
        if (!this._delayedPackets?.length)
            this._delayedPackets = undefined; // we're done
        else
            setTimeout(this.processDelayedPackets.bind(this), 10);
    }

    private handlePacket(pkt: Packet) {
        const devIdMatch = pkt.deviceIdentifier == this.deviceId;
        if (pkt.requiresAck && devIdMatch) {
            pkt.requiresAck = false // make sure we only do it once
            const crc = pkt.crc;
            const ack = Packet.onlyHeader(crc)
            ack.serviceIndex = JD_SERVICE_INDEX_CRC_ACK;
            this.sendPacketAsync(ack);
        }

        if (pkt.isMultiCommand) {
            if (!pkt.isCommand)
                return; // only commands supported
            const multiCommandClass = pkt.serviceClass;
            const h = this._services.find(s => s.serviceClass == multiCommandClass);
            if (h) {
                // pretend it's directly addressed to us
                pkt.deviceIdentifier = this.deviceId
                pkt.serviceIndex = h.serviceIndex
                h.handlePacket(pkt)
            }
        } else if (devIdMatch) {
            if (!pkt.isCommand)
                return // huh? someone's pretending to be us?
            const h = this._services[pkt.serviceIndex]
            if (h) {
                // log(`handle pkt at ${h.name} cmd=${pkt.service_command}`)
                h.handlePacket(pkt)
            }
        } else {
            if (pkt.isCommand)
                return // it's a command, and it's not for us
            // reception of ACKs is handled by JDDevice class
        }
    }

    private refreshRegisters() {
        this._services.forEach(srv => srv.emit(REFRESH));
    }

    reset() {
        this.clearResetTimer();
        this._restartCounter = 0;
        this._packetCount = 0;
        this.emit(RESET);
    }

    private clearResetTimer() {
        if (this._resetTimeOut) {
            clearTimeout(this._resetTimeOut);
            this._resetTimeOut = undefined;
        }
    }

    private handleResetIn() {
        const [t] = this.controlService.resetIn.values();
        if (this._resetTimeOut)
            clearTimeout(this._resetTimeOut);
        if (t)
            this._resetTimeOut = setTimeout(() => this.reset(), t);
    }
}
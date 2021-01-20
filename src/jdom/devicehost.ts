import { JDBus } from "./bus";
import JDServiceHost from "./servicehost";
import Packet from "./packet";
import { shortDeviceId } from "./pretty";
import { anyRandomUint32, toHex } from "./utils";
import ControlServiceHost from "./controlservicehost";
import { JDEventSource } from "./eventsource";
import { JD_SERVICE_INDEX_CRC_ACK, PACKET_PROCESS, PACKET_SEND, REPORT_RECEIVE, RESET, SELF_ANNOUNCE } from "./constants";

export default class JDDeviceHost extends JDEventSource {
    private _bus: JDBus;
    private readonly _services: JDServiceHost[];
    public readonly deviceId: string;
    public readonly shortId: string;
    public readonly controlService: ControlServiceHost;
    private _restartCounter = 0;
    private _resetTimeOut: any;
    private _packetCount = 0;

    constructor(services: JDServiceHost[], options?: {
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

        this.controlService.announce();

        // reset counter
        this._packetCount = 0;
    }

    get restartCounter() {
        return this._restartCounter;
    }

    get packetCount() {
        return this._packetCount;
    }

    services(): JDServiceHost[] {
        return this._services.slice(0);
    }

    service(serviceIndex: number) {
        return serviceIndex !== undefined && this._services[serviceIndex];
    }

    toString() {
        return `host ${this.shortId}`;
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
            if (pkt.serviceIndex == JD_SERVICE_INDEX_CRC_ACK) {
                console.log("todo got ack")
            }
        }
    }

    refreshRegisters() {
        this._services.forEach(srv => srv.refreshRegisters());
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
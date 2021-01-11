import { ControlAnnounceFlags, ControlCmd } from "../../jacdac-spec/dist/specconstants";
import { JDBus } from "./bus";
import { CMD_ADVERTISEMENT_DATA, IDENTIFY, JD_SERVICE_INDEX_CTRL, RESET, SELF_ANNOUNCE, SystemCmd } from "./constants";
import { JDEventSource } from "./eventsource";
import Packet from "./packet";
import { shortDeviceId } from "./pretty";
import { anyRandomUint32, toHex } from "./utils";

export class JDServiceHost extends JDEventSource {
    public serviceNumber: number = -1; // set by device

    constructor(
        public readonly serviceClass: number) {
        super();
    }
}

export interface JDDeviceHostOptions {
    deviceId?: string;
    services?: JDServiceHost[];
}

const SERVICE_OFFSET = 1;
export class JDDeviceHost extends JDEventSource {
    private readonly _services: JDServiceHost[];
    public readonly deviceId: string;
    public readonly shortId: string;
    private _statusCode: number = 0; // u16, u16
    private restartCounter = 0;
    private packetCount = 0;

    constructor(public readonly bus: JDBus, private readonly options?: JDDeviceHostOptions) {
        super();
        this._services = options.services?.slice(0) || [];
        if (!this.options.deviceId) {
            const devId = anyRandomUint32(8);
            for (let i = 0; i < 8; ++i) devId[i] &= 0xff;
            this.options.deviceId = toHex(devId);
        }
        this.deviceId = options.deviceId;
        this.shortId = shortDeviceId(this.deviceId);
        this.handleAnnounce = this.handleAnnounce.bind(this);
    }

    protected log(msg: any) {
        console.log(`${this.deviceId}: ${msg}`);
    }

    start() {
        this._services.forEach((srv, i) => srv.serviceNumber = i + SERVICE_OFFSET);
        this.on(SELF_ANNOUNCE, this.handleAnnounce);
        this.log(`start host`)
    }

    stop() {
        this.off(SELF_ANNOUNCE, this.handleAnnounce);
        this.log(`stop host`)
    }

    private handleAnnounce() {
        this.announce();
    }

    announce() {
        if (this.restartCounter < 0xf)
            this.restartCounter++
        this.packetCount++;
        // restartCounter, flags, packetCount, serviceClass
        const pkt = Packet.jdpacked<[number, ControlAnnounceFlags, number, number[]]>(ControlCmd.Services, "u8 u8 u8 x[1] u32[]",
            [this.restartCounter, ControlAnnounceFlags.SupportsACK, this.packetCount, this._services.map(srv => srv.serviceClass)])
        pkt.serviceIndex = JD_SERVICE_INDEX_CTRL;
        pkt.deviceIdentifier = this.deviceId;
        pkt.sendCoreAsync(this.bus);
        // reset counter
        this.packetCount = 0;
    }

    identify() {
        this.emit(IDENTIFY);
    }

    reset() {
        this.emit(RESET);
        this.restartCounter = 0;
        this.packetCount = 0;
    }

    services(): JDServiceHost[] {
        return this._services.slice(0);
    }

    get statusCode() {
        return this._statusCode;
    }

    setStatusCode(code: number, vendorCode: number) {
        const c = ((code & 0xffff) << 16) | (vendorCode & 0xffff)
        if (c !== this._statusCode)
            this._statusCode = c;
    }

    toString() {
        return this.deviceId;
    }

    handlePacket(pkt: Packet) {
        console.log({ pkt });
        // control service
        if (pkt.serviceIndex === 0) {
            switch (pkt.serviceCommand) {
                case ControlCmd.Services: this.announce(); break;
                case ControlCmd.Identify: this.identify(); break;
                case ControlCmd.Reset: this.reset(); break;
                case ControlCmd.Noop: break;
                case ControlCmd.FloodPing:
                    // ignore
                    break;
            }
            return;
        }

        // route to other services

    }
}
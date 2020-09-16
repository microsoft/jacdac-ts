import { Packet } from "./packet"
import {
    JD_SERVICE_NUMBER_CTRL, DEVICE_ANNOUNCE, DEVICE_CHANGE, ANNOUNCE, DISCONNECT, CONNECT,
    JD_ADVERTISEMENT_0_COUNTER_MASK, DEVICE_RESTART, RESTART, CHANGE,
    PACKET_RECEIVE, PACKET_REPORT, CMD_EVENT, PACKET_EVENT, FIRMWARE_INFO, DEVICE_FIRMWARE_INFO, SRV_CTRL, CtrlCmd, DEVICE_NODE_NAME, LOST, DEVICE_LOST, DEVICE_FOUND, FOUND, JD_SERVICE_NUMBER_CRC_ACK
} from "./constants"
import { hash, fromHex, idiv, read32, SMap, bufferEq, assert } from "./utils"
import { getNumber, NumberFormat } from "./buffer";
import { JDBus } from "./bus";
import { JDService } from "./service";
import { serviceClass, shortDeviceId } from "./pretty";
import { JDNode } from "./node";
import { isInstanceOf } from "./spec";
import { FirmwareInfo } from "./flashing";

export interface PipeInfo {
    pipeType?: string;
    localPipe?: any;
}

interface AckAwaiter {
    pkt: Packet
    retriesLeft: number
    okCb: () => void
    errCb: () => void
}

export class JDDevice extends JDNode {
    connected: boolean;
    private _lost: boolean;
    servicesData: Uint8Array
    lastSeen: number
    lastServiceUpdate: number
    private _shortId: string
    private _services: JDService[]
    private ports: SMap<PipeInfo>;
    private _firmwareInfo: FirmwareInfo;
    private ackAwaiting: AckAwaiter[]

    constructor(public readonly bus: JDBus, public readonly deviceId: string) {
        super();
        this.connected = true;
        this._lost = false;
    }

    get id() {
        return `${this.nodeKind}:${this.deviceId}`
    }

    get nodeKind() {
        return DEVICE_NODE_NAME
    }

    get name() {
        return this.lookupName() || this.shortId;
    }

    private lookupName() {
        const namer = this.bus.host.deviceNamer;
        return namer && namer(this);
    }

    get qualifiedName() {
        return this.name
    }

    get announced(): boolean {
        return !!this.servicesData && !!this.servicesData.length;
    }

    get shortId() {
        // TODO measure if caching is worth it
        if (!this._shortId)
            this._shortId = shortDeviceId(this.deviceId)
        return this._shortId;
    }

    get firmwareInfo() {
        return this._firmwareInfo;
    }

    get parent(): JDNode {
        return this.bus
    }

    set firmwareInfo(info: FirmwareInfo) {
        const changed = JSON.stringify(this._firmwareInfo) !== JSON.stringify(info);
        if (changed) {
            this._firmwareInfo = info;
            this.bus.emit(DEVICE_FIRMWARE_INFO, this)
            this.emit(FIRMWARE_INFO)
            this.bus.emit(DEVICE_CHANGE, this)
            this.emit(CHANGE)
        }
    }

    get lost() {
        return this._lost;
    }

    set lost(v: boolean) {
        if (!!v === this.lost) return;

        // something changed
        this._lost = !!v;
        if (this.lost) {
            this.emit(LOST)
            this.bus.emit(DEVICE_LOST, this)
        } else {
            this.emit(FOUND)
            this.bus.emit(DEVICE_FOUND, this)
        }
        this.emit(CHANGE)
        this.bus.emit(DEVICE_CHANGE, this)
        this.bus.emit(CHANGE)
    }

    toString() {
        return this.shortId + (this.name ? ` (${this.name})` : ``)
    }

    hasService(service_class: number): boolean {
        if (!this.announced) return false;
        if (service_class === 0) return true;

        for (let i = 0; i < this.servicesData.length; i += 4) {
            const sc = getNumber(this.servicesData, NumberFormat.UInt32LE, i);
            if (isInstanceOf(sc, service_class))
                return true
        }
        return false
    }

    port(id: number) {
        if (!this.ports)
            this.ports = {}
        const key = id + ""
        const ex = this.ports[key]
        if (!ex)
            return this.ports[key] = {}
        return ex
    }

    get serviceLength() {
        if (!this.announced) return 0;
        return this.servicesData.length >> 2;
    }

    serviceClassAt(idx: number): number {
        idx <<= 2
        if (!this.announced || idx + 4 > this.servicesData.length)
            return undefined
        if (idx == 0)
            return 0
        return read32(this.servicesData, idx)
    }

    get serviceClasses(): number[] {
        const r = [];
        const n = this.serviceLength;
        for (let i = 0; i < n; ++i)
            r.push(this.serviceClassAt(i))
        return r;
    }

    private initServices() {
        assert(this.announced)
        if (!this._services) {
            const n = this.serviceLength;
            let s = [];
            for (let i = 0; i < n; ++i)
                s.push(new JDService(this, i));
            this._services = s;
        }
    }

    service(service_number: number): JDService {
        if (!this.announced) return undefined;
        this.initServices();
        service_number = service_number | 0;
        return this._services && this._services[service_number];
    }


    services(options?: { serviceNumber?: number, serviceName?: string, serviceClass?: number }): JDService[] {
        if (!this.announced) return [];

        if (options?.serviceNumber >= 0)
            return [this.service(options?.serviceNumber)]

        if (options?.serviceName && options?.serviceClass > -1)
            throw Error("serviceClass and serviceName cannot be used together")
        let sc = serviceClass(options?.serviceName);
        if (sc === undefined) sc = options?.serviceClass;
        if (sc === undefined) sc = -1;

        this.initServices();
        let r = this._services.slice();
        if (sc > -1) r = r.filter(s => s.serviceClass == sc)
        return r;
    }

    sendCtrlCommand(cmd: number, payload: Buffer = null) {
        const pkt = !payload ? Packet.onlyHeader(cmd) : Packet.from(cmd, payload)
        pkt.service_number = JD_SERVICE_NUMBER_CTRL
        return pkt.sendCmdAsync(this)
    }

    processAnnouncement(pkt: Packet) {
        const w0 = this.servicesData ? getNumber(this.servicesData, NumberFormat.UInt32LE, 0) : 0
        const w1 = getNumber(pkt.data, NumberFormat.UInt32LE, 0)

        if (w1 && (w1 & JD_ADVERTISEMENT_0_COUNTER_MASK) < (w0 & JD_ADVERTISEMENT_0_COUNTER_MASK)) {
            this.bus.emit(DEVICE_RESTART, this);
            this.emit(RESTART)
            this.bus.emit(DEVICE_CHANGE, this);
            this.emit(CHANGE)
        }

        if (!bufferEq(pkt.data, this.servicesData)) {
            this.servicesData = pkt.data
            this.lastServiceUpdate = pkt.timestamp
            this.bus.emit(DEVICE_ANNOUNCE, this);
            this.emit(ANNOUNCE)
            this.emit(CHANGE)
            this.bus.emit(DEVICE_CHANGE, this);
            this.bus.emit(CHANGE);
        }
    }

    processPacket(pkt: Packet) {
        this.lost = false
        this.emit(PACKET_RECEIVE, pkt)
        if (pkt.is_report)
            this.emit(PACKET_REPORT, pkt)
        else if (pkt.service_command == CMD_EVENT)
            this.emit(PACKET_EVENT, pkt)

        const service = this.service(pkt.service_number)
        if (service)
            service.processPacket(pkt);
    }

    disconnect() {
        this.connected = false;
        this.emit(DISCONNECT)
        this.emit(CHANGE)
    }

    identify() {
        return this.service(SRV_CTRL)
            .sendCmdAsync(CtrlCmd.Identify)
    }

    reset() {
        return this.service(SRV_CTRL)
            .sendCmdAsync(CtrlCmd.Identify)
    }

    private initAcks() {
        this.ackAwaiting = []
        this.on(PACKET_REPORT, (rep: Packet) => {
            if (rep.service_number != JD_SERVICE_NUMBER_CRC_ACK)
                return
            let numdone = 0
            for (const aa of this.ackAwaiting) {
                if (aa.pkt && aa.pkt.crc == rep.service_command) {
                    aa.pkt = null
                    numdone++
                    aa.okCb()
                }
            }
            if (numdone)
                this.ackAwaiting = this.ackAwaiting.filter(aa => !!aa.pkt)
        })

        const resend = () => {
            let numdrop = 0
            for (const aa of this.ackAwaiting) {
                if (aa.pkt) {
                    if (--aa.retriesLeft < 0) {
                        aa.pkt = null
                        aa.errCb()
                        numdrop++
                    } else {
                        aa.pkt.sendCmdAsync(this)
                    }
                }
            }
            if (numdrop)
                this.ackAwaiting = this.ackAwaiting.filter(aa => !!aa.pkt)
            setTimeout(resend, Math.random() * 30 + 20)
        }
        setTimeout(resend, 10)
    }

    sendPktWithAck(pkt: Packet) {
        pkt.requires_ack = true
        if (!this.ackAwaiting)
            this.initAcks()
        return new Promise<void>((resolve, reject) => {
            this.ackAwaiting.push({
                pkt,
                retriesLeft: 4,
                okCb: resolve,
                errCb: () => reject(new Error("No ACK for " + pkt.toString()))
            })
            pkt.sendCmdAsync(this)
        })
    }
}

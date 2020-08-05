import { Packet } from "./packet"
import {
    JD_SERVICE_NUMBER_CTRL, DEVICE_ANNOUNCE, DEVICE_CHANGE, ANNOUNCE, DISCONNECT, CONNECT,
    JD_ADVERTISEMENT_0_COUNTER_MASK, DEVICE_RESTART, RESTART, CHANGE,
    PACKET_RECEIVE, PACKET_REPORT, CMD_EVENT, PACKET_EVENT
} from "./constants"
import { hash, fromHex, idiv, read32, SMap, bufferEq, assert } from "./utils"
import { getNumber, NumberFormat } from "./buffer";
import { JDBus } from "./bus";
import { JDService } from "./service";
import { serviceClass } from "./pretty";
import { JDNode } from "./node";
import { isInstanceOf } from "./spec";

export interface PipeInfo {
    pipeType?: string;
}

export class JDDevice extends JDNode {
    connected: boolean;
    private servicesData: Uint8Array
    lastSeen: number
    lastServiceUpdate: number
    private _shortId: string
    private _services: JDService[]
    private ports: SMap<PipeInfo>

    constructor(public readonly bus: JDBus, public readonly deviceId: string) {
        super();
        this.connected = true;
    }

    get id() {
        return `dev:${this.deviceId}`
    }

    get name() {
        return this.bus.lookupName(this.deviceId) || this.bus.lookupName(this.shortId) || this.shortId;
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

    toString() {
        return this.shortId + (this.name ? ` (${this.name})` : ``)
    }

    hasService(service_class: number): boolean {
        if (!this.announced) return false;
        for (let i = 4; i < this.servicesData.length; i += 4) {
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

        const servData = this.servicesData?.slice(4)
        if (!bufferEq(pkt.data.slice(4), servData)) {
            this.servicesData = pkt.data
            this.lastServiceUpdate = pkt.timestamp
            if (this._services) {
                // patch services
                throw new Error("need to patch services")
            }
            this.bus.emit(DEVICE_ANNOUNCE, this);
            this.emit(ANNOUNCE)
            this.bus.emit(DEVICE_CHANGE, this);
            this.emit(CHANGE)
        }
    }

    processPacket(pkt: Packet) {
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
}

// 2 letter + 2 digit ID; 1.8%/0.3%/0.07%/0.015% collision probability among 50/20/10/5 devices
export function shortDeviceId(devid: string) {
    const h = hash(fromHex(devid), 30)
    return String.fromCharCode(0x41 + h % 26) +
        String.fromCharCode(0x41 + idiv(h, 26) % 26) +
        String.fromCharCode(0x30 + idiv(h, 26 * 26) % 10) +
        String.fromCharCode(0x30 + idiv(h, 26 * 26 * 10) % 10)
}
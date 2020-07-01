import { Packet } from "./packet"
import {
    JD_SERVICE_NUMBER_CTRL, DEVICE_ANNOUNCE, DEVICE_CHANGE, ANNOUNCE, DISCONNECT, CONNECT,
    JD_ADVERTISEMENT_0_COUNTER_MASK, DEVICE_RESTART, RESTART, CHANGE
} from "./constants"
import { hash, fromHex, idiv, read32, SMap, bufferEq, assert } from "./utils"
import { getNumber, NumberFormat } from "./buffer";
import { Bus } from "./bus";
import { Service } from "./service";
import { serviceClass } from "./pretty";
import { Node } from "./node";

export class Device extends Node {
    connected: boolean;
    private servicesData: Uint8Array
    lastSeen: number
    lastServiceUpdate: number
    private _shortId: string
    private _services: Service[]

    constructor(public readonly bus: Bus, public readonly deviceId: string) {
        super();
        this.connected = true;
    }

    get id() {
        return `dev:${this.deviceId}`
    }

    get name() {
        return this.bus.lookupName(this.deviceId) || this.bus.lookupName(this.shortId);
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
        for (let i = 4; i < this.servicesData.length; i += 4)
            if (getNumber(this.servicesData, NumberFormat.UInt32LE, i) == service_class)
                return true
        return false
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
                s.push(new Service(this, i));
            this._services = s;
        }
    }

    service(service_number: number) {
        if (!this.announced) return undefined;
        this.initServices();
        service_number = service_number | 0;
        return this._services && this._services[service_number];
    }


    services(options?: { serviceNumber?: number, serviceName?: string, serviceClass?: number }): Service[] {
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
        pkt.sendCmdAsync(this)
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
                throw new Error("need to patch vervices")
            }
            this.bus.emit(DEVICE_ANNOUNCE, this);
            this.emit(ANNOUNCE)
            this.bus.emit(DEVICE_CHANGE, this);
            this.emit(CHANGE)
        }
    }

    processPacket(pkt: Packet) {
        const service = this.service(pkt.service_number)
        if (service)
            service.processPacket(pkt);
    }

    disconnect() {
        this.connected = false;
        this.emit(DISCONNECT)
    }
}


// 4 letter ID; 0.04%/0.01%/0.002% collision probability among 20/10/5 devices
// 3 letter ID; 1.1%/2.6%/0.05%
// 2 letter ID; 25%/6.4%/1.5%
export function shortDeviceId(devid: string) {
    const h = hash(fromHex(devid), 30)
    return String.fromCharCode(0x41 + h % 26) +
        String.fromCharCode(0x41 + idiv(h, 26) % 26) +
        String.fromCharCode(0x41 + idiv(h, 26 * 26) % 26) +
        String.fromCharCode(0x41 + idiv(h, 26 * 26 * 26) % 26)
}
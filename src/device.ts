import { Packet } from "./packet"
import { JD_SERVICE_NUMBER_CTRL, DEVICE_ANNOUNCE } from "./constants"
import { hash, fromHex, idiv, read32, SMap, bufferEq } from "./utils"
import { getNumber, NumberFormat } from "./buffer";
import { Bus } from "./bus";
import { Service } from "./service";
import { serviceClass, serviceName } from "./pretty";

export class Device {
    connected: boolean;
    private servicesData: Uint8Array
    lastSeen: number
    lastServiceUpdate: number
    currentReading: Uint8Array
    private _shortId: string
    private _services: Service[]

    constructor(public bus: Bus, public deviceId: string) {
        this.connected = true;
    }

    get name() {
        return this.bus.lookupName(this.deviceId) || this.bus.lookupName(this.shortId);
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
        if (!this.servicesData) return false;
        for (let i = 4; i < this.servicesData.length; i += 4)
            if (getNumber(this.servicesData, NumberFormat.UInt32LE, i) == service_class)
                return true
        return false
    }

    get serviceLength() {
        if (!this.servicesData) return 0;
        return this.servicesData.length >> 2;
    }

    serviceClassAt(idx: number): number {
        idx <<= 2
        if (!this.servicesData || idx + 4 > this.servicesData.length)
            return undefined
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
        if (!this._services) {
            const n = this.serviceLength;
            let s = [];
            for (let i = 0; i < n; ++i)
                s.push(new Service(this, i));
            this._services = s;
        }
    }

    services(options?: { serviceName?: string, serviceClass?: number }): Service[] {
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
        if (!bufferEq(pkt.data, this.servicesData)) {
            this.servicesData = pkt.data
            this.lastServiceUpdate = pkt.timestamp
            // todo better patching
            this._services = undefined;
            this.bus.emit(DEVICE_ANNOUNCE, this);
        }
    }

    service(service_number: number) {
        this.initServices();
        return this._services[service_number];
    }

    processPacket(pkt: Packet) {
        const service = this.service(pkt.service_number)
        if (service)
            service.processPacket(pkt);
    }

    disconnect() {
        this.connected = false;
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
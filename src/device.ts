import { Packet } from "./packet"
import { JD_SERVICE_NUMBER_CTRL } from "./constants"
import { hash, fromHex, idiv, read32, SMap, bufferEq } from "./utils"
import { getNumber, NumberFormat } from "./buffer";
import { Bus } from "./bus";

export class Device {
    connected: boolean;
    services: Uint8Array
    lastSeen: number
    lastServiceUpdate: number
    currentReading: Uint8Array
    private _shortId: string

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
        if (!this.services) return false;
        for (let i = 4; i < this.services.length; i += 4)
            if (getNumber(this.services, NumberFormat.UInt32LE, i) == service_class)
                return true
        return false
    }

    get serviceLength() {
        if (!this.services) return 0;
        return this.services.length >> 2;
    }

    serviceClassAt(idx: number): number {
        idx <<= 2
        if (!this.services || idx + 4 > this.services.length)
            return undefined
        return read32(this.services, idx)
    }

    get serviceClasses(): number[] {
        const r = [];
        const n = this.serviceLength;
        for (let i = 0; i < n; ++i)
            r.push(this.serviceClassAt(i))
        return r;
    }

    sendCtrlCommand(cmd: number, payload: Buffer = null) {
        const pkt = !payload ? Packet.onlyHeader(cmd) : Packet.from(cmd, payload)
        pkt.service_number = JD_SERVICE_NUMBER_CTRL
        pkt.sendCmdAsync(this)
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
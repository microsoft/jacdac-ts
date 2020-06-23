import { Packet } from "./jdpacket"
import { JD_SERVICE_NUMBER_CTRL } from "./jdconstants"
import { hash, fromHex, idiv, getNumber, NumberFormat, read32, SMap } from "./jdutils"

const devices_: Device[] = []
export const deviceNames: SMap<string> = {}

/**
 * Gets the current list of known devices on the bus
 */
export function getDevices() { return devices_.slice() }

/**
 * Gets a device on the bus
 * @param id 
 */
export function getDevice(id: string) {
    let d = devices_.find(d => d.deviceId == id)
    if (!d)
        d = new Device(id)
    return d
}

export class Device {
    services: Uint8Array
    lastSeen: number
    lastServiceUpdate: number
    currentReading: Uint8Array
    private _shortId: string

    constructor(public deviceId: string) {
        devices_.push(this)
    }

    get name() {
        return deviceNames[this.deviceId] || deviceNames[this.shortId]
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

    hasService(service_class: number) {
        for (let i = 4; i < this.services.length; i += 4)
            if (getNumber(this.services, NumberFormat.UInt32LE, i) == service_class)
                return true
        return false
    }

    serviceAt(idx: number) {
        idx <<= 2
        if (!this.services || idx + 4 > this.services.length)
            return undefined
        return read32(this.services, idx)
    }

    sendCtrlCommand(cmd: number, payload: Buffer = null) {
        const pkt = !payload ? Packet.onlyHeader(cmd) : Packet.from(cmd, payload)
        pkt.service_number = JD_SERVICE_NUMBER_CTRL
        pkt.sendCmdAsync(this)
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
import { Packet } from "./packet"
import { JD_SERVICE_NUMBER_CTRL, CMD_ADVERTISEMENT_DATA } from "./constants"
import { hash, fromHex, idiv, getNumber, NumberFormat, read32, SMap, bufferEq } from "./utils"

export interface BusOptions {
    sendPacket: (p: Packet) => Promise<void>;
    disconnect: () => Promise<void>;
}

/**
 * A JACDAC bus manager. This instance maintains the list of devices on the bus.
 */
export class Bus {
    private devices_: Device[] = []
    private deviceNames: SMap<string> = {}

    /**
     * Creates the bus with the given transport
     * @param sendPacket 
     */
    constructor(public options: BusOptions) {
    }

    sendPacket(p: Packet) {
        return this.options.sendPacket(p);
    }

    disconnect() {
        return this.options.disconnect();
    }

    /**
     * Gets the current list of known devices on the bus
     */
    getDevices() { return this.devices_.slice() }

    /**
     * Gets a device on the bus
     * @param id 
     */
    getDevice(id: string) {
        let d = this.devices_.find(d => d.deviceId == id)
        if (!d) {
            d = new Device(this, id)
            this.devices_.push(d);
        }
        return d
    }


    /**
     * Ingests and process a packet received from the bus.
     * @param pkt a jacdac packet
     */
    processPacket(pkt: Packet) {
        if (pkt.multicommand_class) {
            //
        } else if (pkt.is_command) {
            pkt.dev = this.getDevice(pkt.device_identifier)
        } else {
            const dev = pkt.dev = this.getDevice(pkt.device_identifier)
            dev.lastSeen = pkt.timestamp

            if (pkt.service_number == JD_SERVICE_NUMBER_CTRL) {
                if (pkt.service_command == CMD_ADVERTISEMENT_DATA) {
                    if (!bufferEq(pkt.data, dev.services)) {
                        dev.services = pkt.data
                        dev.lastServiceUpdate = pkt.timestamp
                        // reattach(dev)
                    }
                }
            }
        }
    }

    /**
     * Tries to find the given device by id
     * @param id 
     */
    lookupName(id: string) {
        return this.deviceNames[id];
    }
}


export class Device {
    services: Uint8Array
    lastSeen: number
    lastServiceUpdate: number
    currentReading: Uint8Array
    private _shortId: string

    constructor(public bus: Bus, public deviceId: string) {
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
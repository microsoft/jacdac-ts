import { Packet } from "./packet"
import { JD_SERVICE_NUMBER_CTRL, CMD_ADVERTISEMENT_DATA, ConsolePriority, CMD_CONSOLE_SET_MIN_PRIORITY, JD_SERVICE_LOGGER, CMD_EVENT } from "./constants"
import { hash, fromHex, idiv, read32, SMap, bufferEq } from "./utils"
import { EventEmitter } from "./eventemitter"
import { getNumber, NumberFormat } from "./buffer";

export interface BusOptions {
    sendPacket: (p: Packet) => Promise<void>;
    disconnect: () => Promise<void>;
}

export interface PacketEventEmitter {
    /**
     * Event emitted when the bus is disconnected
     * @param event 
     * @param listener 
     */
    on(event: 'disconnect', listener: () => void): boolean;

    /**
     * Event emitted when a packet is received and processed
     * @param event 
     * @param listener 
     */
    on(event: 'packet', listener: (packet: Packet) => void): boolean;

    /**
     * Event containing an event from a sensor
     * @param event 
     * @param listener 
     */
    on(event: 'packetevent', listener: (packet: Packet) => void): boolean;

    /**
     * Event emitted when a device is detected on the bus. The information on the device might not be fully populated yet.
     * @param event 
     * @param listener 
     */
    on(event: 'deviceconnect', listener: (device: Device) => void): boolean;

    /**
     * Event emitted when a device hasn't been on the bus for a while and is considered disconected.
     * @param event 
     * @param listener 
     */
    on(event: 'devicedisconnect', listener: (device: Device) => void): boolean;

    /**
     * Event emitted device advertisement information for a device has been updated
     * @param event 
     * @param listener 
     */
    on(event: 'announce', listener: (device: Device) => void): boolean;
}

/**
 * A JACDAC bus manager. This instance maintains the list of devices on the bus.
 */
export class Bus extends EventEmitter implements PacketEventEmitter {
    private _devices: Device[] = [];
    private _deviceNames: SMap<string> = {};
    private _startTime: number;
    private _gcInterval: any;
    private _minConsolePriority = ConsolePriority.Log;

    /**
     * Creates the bus with the given transport
     * @param sendPacket 
     */
    constructor(public options: BusOptions) {
        super();
        this._startTime = Date.now();

        this.on('announce', () => this.pingLoggers());
    }

    get timestamp() {
        return Date.now() - this._startTime;
    }

    get minConsolePriority(): ConsolePriority {
        return this._minConsolePriority;
    }

    set minConsolePriority(priority: ConsolePriority) {
        if (priority !== this._minConsolePriority) {
            this._minConsolePriority = priority;
        }
    }

    private pingLoggers() {
        if (this._minConsolePriority < ConsolePriority.Silent) {
            this.log(`ping loggers`)
            const pkt = Packet.packed(CMD_CONSOLE_SET_MIN_PRIORITY, "i", [this._minConsolePriority]);
            pkt.sendAsMultiCommandAsync(this, JD_SERVICE_LOGGER);
        }
    }

    sendPacket(p: Packet) {
        return this.options.sendPacket(p);
    }

    disconnect(): Promise<void> {
        if (this._gcInterval) {
            clearInterval(this._gcInterval);
            this._gcInterval = undefined;
        }
        return this.options.disconnect()
            .then(() => { this.emit("disconnect") })
    }

    /**
     * Gets the current list of known devices on the bus
     */
    devices() { return this._devices.slice() }

    /**
     * Gets a device on the bus
     * @param id 
     */
    device(id: string) {
        let d = this._devices.find(d => d.deviceId == id)
        if (!d) {
            d = new Device(this, id)
            this._devices.push(d);
            this.emit('deviceconnect', d);

            if (!this._gcInterval)
                this._gcInterval = setInterval(() => this.gcDevices(), 2000);
        }
        return d
    }

    private gcDevices() {
        const cutoff = this.timestamp - 2000;
        for (let i = 0; i < this._devices.length; ++i) {
            const dev = this._devices[i]
            if (dev.lastSeen < cutoff) {
                this._devices.splice(i, 1)
                i--
                dev.disconnect();
                this.emit('devicedisconnect', dev);
            }
        }
    }

    /**
     * Ingests and process a packet received from the bus.
     * @param pkt a jacdac packet
     */
    processPacket(pkt: Packet) {
        if (pkt.multicommand_class) {
            //
        } else if (pkt.is_command) {
            pkt.dev = this.device(pkt.device_identifier)
        } else {
            const dev = pkt.dev = this.device(pkt.device_identifier)
            dev.lastSeen = pkt.timestamp

            if (pkt.service_number == JD_SERVICE_NUMBER_CTRL) {
                if (pkt.service_command == CMD_ADVERTISEMENT_DATA) {
                    if (!bufferEq(pkt.data, dev.services)) {
                        dev.services = pkt.data
                        dev.lastServiceUpdate = pkt.timestamp
                        this.emit('announce', dev);
                    }
                }
            }
        }
        // don't spam with duplicate advertisement events
        if (pkt.service_command !== CMD_ADVERTISEMENT_DATA) {
            this.emit('packet', pkt)
        }
    }

    /**
     * Tries to find the given device by id
     * @param id 
     */
    lookupName(id: string) {
        return this._deviceNames[id];
    }

    log(msg: any) {
        if (this._minConsolePriority > ConsolePriority.Log)
            return
        console.log(msg);
    }
}

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
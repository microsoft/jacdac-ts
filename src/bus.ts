import { Packet } from "./packet";
import { Device } from "./device";
import { EventEmitter } from "./eventemitter";
import { SMap, bufferEq } from "./utils";
import { ConsolePriority, CMD_CONSOLE_SET_MIN_PRIORITY, SRV_LOGGER, JD_SERVICE_NUMBER_CTRL, CMD_ADVERTISEMENT_DATA, CMD_EVENT } from "./constants";

export interface BusOptions {
    sendPacketAsync?: (p: Packet) => Promise<void>;
    connectAsync?: () => Promise<void>;
    disconnectAsync?: () => Promise<void>;
}

export interface Error {
    context: string;
    exception: any;
}

export interface PacketEventEmitter {
    /**
     * Event emitted when the bus is connected
     * @param event 
     * @param listener 
     */
    on(event: 'connect', listener: () => void): boolean;

    /**
     * Event emitted when the bus is connecting
     * @param event 
     * @param listener 
     */
    on(event: 'connecting', listener: () => void): boolean;

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
    on(event: 'packetreceive', listener: (packet: Packet) => void): boolean;

    /**
     * Event emitted when an event packet is received and processed
     * @param event 
     * @param listener 
     */
    on(event: 'packetevent', listener: (packet: Packet) => void): boolean;

    /**
     * Event emitted before a packet is sent
     * @param event 
     * @param listener 
     */
    on(event: 'packetsend', listener: (packet: Packet) => void): boolean;

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
    on(event: 'deviceannounce', listener: (device: Device) => void): boolean;

    /**
     * Event emitted when an exception occurs
     * @param event 
     * @param listener 
     */
    on(event: 'error', listener: (error: Error) => void): void;
}

/**
 * A JACDAC bus manager. This instance maintains the list of devices on the bus.
 */
export class Bus extends EventEmitter implements PacketEventEmitter {
    private _connected = false;
    private _connectPromise: Promise<void>;

    private _devices: Device[] = [];
    private _deviceNames: SMap<string> = {};
    private _startTime: number;
    private _gcInterval: any;
    private _minConsolePriority = ConsolePriority.Log;

    /**
     * Creates the bus with the given transport
     * @param sendPacket 
     */
    constructor(public options?: BusOptions) {
        super();
        this.options = this.options || {};
        this.resetTime();
        this.on('deviceannounce', () => this.pingLoggers());
    }

    private resetTime() {
        this._startTime = Date.now();
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
            const pkt = Packet.packed(CMD_CONSOLE_SET_MIN_PRIORITY, "i", [this._minConsolePriority]);
            pkt.sendAsMultiCommandAsync(this, SRV_LOGGER);
        }
    }

    sendPacketAsync(p: Packet) {
        this.emit('packetsend', p);
        return this.options?.sendPacketAsync(p) || Promise.resolve();
    }

    get connecting() {
        return !!this._connectPromise;
    }

    get connected() {
        return this._connected;
    }

    errorHandler(context: string, exception: any) {
        this.emit("error", { context, exception })
    }

    connectAsync(): Promise<void> {
        // already connected
        if (this._connected)
            return Promise.resolve();
        // connecting
        if (!this._connectPromise) {
            this._connected = false;
            this._connectPromise = Promise.resolve();
            this.emit("connecting");
            const connectAsyncPromise = this.options?.connectAsync() || Promise.resolve();
            this._connectPromise = connectAsyncPromise
                .then(() => {
                    this._connectPromise = undefined;
                    this._connected = true;
                    this.emit("connect");
                })
                .catch(e => {
                    this.errorHandler("connect", e);
                    this._connected = false;
                    this._connectPromise = undefined;
                    this.emit("disconnect");
                })
        }
        return this._connectPromise;
    }

    async disconnectAsync(): Promise<void> {
        if (!this._connected) return Promise.resolve();

        if (this._connectPromise)
            throw new Error("trying to disconnect while connecting");
        this._connected = false;
        if (this._gcInterval) {
            clearInterval(this._gcInterval);
            this._gcInterval = undefined;
        }
        try {
            this.options?.disconnectAsync();
        } catch (e) {
            this.errorHandler("disconnect", e)
        }
        finally {
            this.emit("disconnet");
        }
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

            if (!this._gcInterval && this.connected)
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
                        this.emit('deviceannounce', dev);
                    }
                }
            }
        }
        // don't spam with duplicate advertisement events
        if (pkt.service_command !== CMD_ADVERTISEMENT_DATA) {
            this.emit('packetreceive', pkt)
            if (pkt.service_command === CMD_EVENT)
                this.emit('packetevent', pkt);
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

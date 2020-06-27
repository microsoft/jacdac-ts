import { Packet } from "./packet";
import { Device } from "./device";
import { PubSub, EventHandler } from "./eventemitter";
import { SMap } from "./utils";
import { ConsolePriority, CMD_CONSOLE_SET_MIN_PRIORITY, SRV_LOGGER, JD_SERVICE_NUMBER_CTRL, CMD_ADVERTISEMENT_DATA, CMD_EVENT } from "./constants";
import { queryAsync, subscribeAsync } from "./graphql";
import { serviceClass } from "./pretty";
import { PubSubEngine } from "graphql-subscriptions";

export interface BusOptions {
    sendPacketAsync?: (p: Packet) => Promise<void>;
    connectAsync?: () => Promise<void>;
    disconnectAsync?: () => Promise<void>;
    pubSub?: PubSubEngine;
}

export interface Error {
    context: string;
    exception: any;
}

export const CONNECT = 'connect';
export const CONNECTING = 'connecting';
export const DISCONNECT = 'disconnect';

export const DEVICE_CONNECT = 'deviceConnect'
export const DEVICE_DISCONNECT = 'deviceDisconnect'
export const DEVICE_ANNOUNCE = 'deviceAnnounce'

export const PACKET_SEND = 'packetSend'
export const PACKET_RECEIVE = 'packetReceive'
export const PACKET_EVENT = 'packetEvent'
export const ERROR = 'error'

/**
 * A JACDAC bus manager. This instance maintains the list of devices on the bus.
 */
export class Bus {
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
        this.options = this.options || {};
        this.options.pubSub = this.options.pubSub || new PubSub();
        this.resetTime();
        this.pubSub.subscribe(DEVICE_ANNOUNCE, () => this.pingLoggers(), undefined);
    }

    on(eventName: string, listener: EventHandler) {
        this.pubSub.subscribe(eventName, listener, undefined);
    }

    emit(eventName: string, payload?: any) {
        this.pubSub.publish(eventName, payload);
    }

    private get pubSub() {
        return this.options.pubSub;
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
        this.emit(PACKET_SEND, p);
        return this.options?.sendPacketAsync(p) || Promise.resolve();
    }

    get connecting() {
        return !!this._connectPromise;
    }

    get connected() {
        return this._connected;
    }

    errorHandler(context: string, exception: any) {
        this.emit(ERROR, { context, exception })
    }

    connectAsync(): Promise<void> {
        // already connected
        if (this._connected)
            return Promise.resolve();
        // connecting
        if (!this._connectPromise) {
            this._connected = false;
            this._connectPromise = Promise.resolve();
            this.emit(CONNECTING);
            const connectAsyncPromise = this.options?.connectAsync() || Promise.resolve();
            this._connectPromise = connectAsyncPromise
                .then(() => {
                    this._connectPromise = undefined;
                    this._connected = true;
                    this.emit(CONNECT);
                })
                .catch(e => {
                    this.errorHandler(CONNECT, e);
                    this._connected = false;
                    this._connectPromise = undefined;
                    this.emit(DISCONNECT);
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
            this.errorHandler(DISCONNECT, e)
        }
        finally {
            this.emit(DISCONNECT);
        }
    }

    /**
     * Gets the current list of known devices on the bus
     */
    devices(options?: { serviceName?: string, serviceClass?: number }) {
        if (options?.serviceName && options?.serviceClass > -1)
            throw Error("serviceClass and serviceName cannot be used together")
        let sc = serviceClass(options?.serviceName);
        if (sc === undefined) sc = options?.serviceClass;
        if (sc === undefined) sc = -1;


        let r = this._devices.slice();
        if (sc > -1) r = r.filter(s => s.hasService(sc))
        return r;
    }

    /**
     * Gets a device on the bus
     * @param id 
     */
    device(id: string) {
        let d = this._devices.find(d => d.deviceId == id)
        if (!d) {
            d = new Device(this, id)
            this._devices.push(d);
            this.emit(DEVICE_CONNECT, d);

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
                this.emit(DEVICE_DISCONNECT, dev);
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
            pkt.dev.processPacket(pkt);
        } else {
            const dev = pkt.dev = this.device(pkt.device_identifier)
            dev.lastSeen = pkt.timestamp

            if (pkt.service_number == JD_SERVICE_NUMBER_CTRL) {
                if (pkt.service_command == CMD_ADVERTISEMENT_DATA) {
                    dev.processAnnouncement(pkt)
                }
            } else
                pkt.dev.processPacket(pkt);
        }
        // don't spam with duplicate advertisement events
        if (pkt.service_command !== CMD_ADVERTISEMENT_DATA) {
            this.emit(PACKET_RECEIVE, pkt)
            if (pkt.service_command === CMD_EVENT)
                this.emit(PACKET_EVENT, pkt);
        }
    }

    /**
     * Executes a JACDAC GraphQL query against the current state of the bus
     * @param query 
     */
    queryAsync(query: string) {
        return queryAsync(this, query);
    }

    subscribeAsync(query: string) {
        return subscribeAsync(this, query);
    }

    deviceChanged() {
        return this.pubSub.asyncIterator([
            DEVICE_CONNECT,
            DEVICE_ANNOUNCE,
            DEVICE_DISCONNECT]);
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

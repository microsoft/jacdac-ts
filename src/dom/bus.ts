import { Packet } from "./packet";
import { Device } from "./device";
import { Node } from "./node";
import { SMap } from "./utils";
import {
    ConsolePriority,
    CMD_CONSOLE_SET_MIN_PRIORITY,
    SRV_LOGGER, JD_SERVICE_NUMBER_CTRL,
    CMD_ADVERTISEMENT_DATA,
    CMD_EVENT, DEVICE_ANNOUNCE,
    PACKET_SEND,
    ERROR,
    CONNECTING,
    CONNECT,
    DISCONNECT,
    DEVICE_CONNECT,
    DEVICE_DISCONNECT,
    PACKET_RECEIVE,
    PACKET_EVENT,
    PACKET_REPORT,
    PACKET_PROCESS,
    CONNECTION_STATE,
    DISCONNECTING,
    DEVICE_CHANGE
} from "./constants";
import { serviceClass } from "./pretty";

export interface BusOptions {
    sendPacketAsync?: (p: Packet) => Promise<void>;
    connectAsync?: (userRequest?: boolean) => Promise<void>;
    disconnectAsync?: () => Promise<void>;
}

export interface Error {
    context: string;
    exception: any;
}

export enum BusState {
    Connected,
    Connecting,
    Disconnecting,
    Disconnected
}

/**
 * A JACDAC bus manager. This instance maintains the list of devices on the bus.
 */
export class Bus extends Node {
    private _connectionState = BusState.Disconnected;
    private _connectPromise: Promise<void>;
    private _disconnectPromise: Promise<void>;

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
        console.log(`new bus...`)
        this.options = this.options || {};
        this.resetTime();
        this.addListener(DEVICE_ANNOUNCE, () => this.pingLoggers());
    }

    get connectionState() {
        return this._connectionState;
    }

    private setConnectionState(state: BusState) {
        if (this._connectionState !== state) {
            this._connectionState = state;
            this.emit(CONNECTION_STATE, this._connectionState);
            switch (this._connectionState) {
                case BusState.Connected: this.emit(CONNECT); break;
                case BusState.Connecting: this.emit(CONNECTING); break;
                case BusState.Disconnecting: this.emit(DISCONNECTING); break;
                case BusState.Disconnected: this.emit(DISCONNECT); break;
            }
        }
    }

    get id() {
        return "bus";
    }

    node(id: string) {
        const m = /^(?<type>bus|dev|srv|reg)(:(?<dev>\w+)(:(?<srv>\w+)(:(?<reg>\w+))?)?)?$/.exec(id)
        if (!m) return undefined;
        switch (m.groups["type"]) {
            case "bus": return this;
            case "dev": return this.device(m.groups["dev"])
            case "srv": return this.device(m.groups["dev"])
                ?.service(parseInt(m.groups["dev"]))
            case "reg": return this.device(m.groups["dev"])
                ?.service(parseInt(m.groups["dev"]))
                ?.registerAt(parseInt(m.groups["reg"]));
        }
        return undefined;
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
        return this.connectionState == BusState.Connecting
    }

    get disconnecting() {
        return this.connectionState == BusState.Disconnecting
    }

    get connected() {
        return this._connectionState == BusState.Connected
    }

    errorHandler(context: string, exception: any) {
        this.emit(ERROR, { context, exception })
    }

    connectAsync(userRequest?: boolean): Promise<void> {
        // already connected
        if (this.connectionState == BusState.Connected)
            return Promise.resolve();

        // connecting
        if (!this._connectPromise) {
            // already disconnecting, retry when disconnected
            if (this._disconnectPromise)
                this._connectPromise = this._disconnectPromise.then(() => this.connectAsync())
            else {
                // starting a fresh connection
                this._connectPromise = Promise.resolve();
                this.setConnectionState(BusState.Connecting)
                const connectAsyncPromise = this.options?.connectAsync(userRequest) || Promise.resolve();
                this._connectPromise = connectAsyncPromise
                    .then(() => {
                        this._connectPromise = undefined;
                        this.setConnectionState(BusState.Connected)
                    })
                    .catch(e => {
                        this._connectPromise = undefined;
                        this.setConnectionState(BusState.Disconnected)
                        this.errorHandler(CONNECT, e);
                    })
            }
        }
        return this._connectPromise;
    }

    disconnectAsync(): Promise<void> {
        // already disconnected
        if (this.connectionState == BusState.Disconnected)
            return Promise.resolve();

        if (!this._disconnectPromise) {
            // connection in progress, wait and disconnect when done
            if (this._connectPromise)
                this._disconnectPromise = this._connectPromise.then(() => this.disconnectAsync())
            else {
                this._disconnectPromise = Promise.resolve();
                this.setConnectionState(BusState.Disconnecting)
                this._disconnectPromise = this._disconnectPromise
                    .then(() => this.options?.disconnectAsync() || Promise.resolve())
                    .catch(e => this.errorHandler(DISCONNECT, e))
                    .finally(() => {
                        this._disconnectPromise = undefined;
                        this._devices.forEach(device => this.disconnectDevice(device))
                        this._devices = []
                        this.setConnectionState(BusState.Disconnected);
                    });
            }
        }
        return this._disconnectPromise;
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
            this.emit(DEVICE_CHANGE, d);

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
                this.disconnectDevice(dev)
            }
        }
        // stop cleanup if all gone
        if (!this._devices.length) {
            if (this._gcInterval) {
                clearInterval(this._gcInterval)
                this._gcInterval = undefined;
            }
        }
    }

    private disconnectDevice(dev: Device) {
        dev.disconnect();
        this.emit(DEVICE_DISCONNECT, dev);
        this.emit(DEVICE_CHANGE, dev)
    }

    /**
     * Ingests and process a packet received from the bus.
     * @param pkt a jacdac packet
     */
    processPacket(pkt: Packet) {
        this.emit(PACKET_PROCESS, pkt)
        let isAnnounce = false
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
                    isAnnounce = true
                    dev.processAnnouncement(pkt)
                }
            } else
                pkt.dev.processPacket(pkt);
        }
        // don't spam with duplicate advertisement events
        if (!isAnnounce) {
            this.emit(PACKET_RECEIVE, pkt)
            if (pkt.is_report)
                this.emit(PACKET_REPORT, pkt)
            if (pkt.is_command && pkt.service_command === CMD_EVENT)
                this.emit(PACKET_EVENT, pkt);
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

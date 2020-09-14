import { Packet } from "./packet";
import { JDDevice } from "./device";
import { SMap, debounceAsync, strcmp, arrayConcatMany } from "./utils";
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
    PACKET_RECEIVE_ANNOUNCE,
    PACKET_EVENT,
    PACKET_REPORT,
    PACKET_PROCESS,
    CONNECTION_STATE,
    DISCONNECTING,
    DEVICE_CHANGE,
    CHANGE,
    FIRMWARE_BLOBS_CHANGE,
    BUS_NODE_NAME,
    DEVICE_NODE_NAME,
    SERVICE_NODE_NAME,
    EVENT_NODE_NAME,
    REGISTER_NODE_NAME,
    FIELD_NODE_NAME,
    JD_DEVICE_DISCONNECTED_DELAY,
    JD_DEVICE_LOST_DELAY
} from "./constants";
import { serviceClass } from "./pretty";
import { JDNode, Log, LogLevel } from "./node";
import { FirmwareBlob, scanFirmwares } from "./flashing";
import { JDService } from "./service";

export interface BusOptions {
    sendPacketAsync?: (p: Packet) => Promise<void>;
    connectAsync?: (background?: boolean) => Promise<void>;
    disconnectAsync?: () => Promise<void>;
    deviceLostDelay?: number;
    deviceDisconnectedDelay?: number;

    log?: Log;
}

export interface Error {
    context: string;
    exception: any;
}

export enum BusState {
    Connected = "connected",
    Connecting = "connecting",
    Disconnecting = "disconnecting",
    Disconnected = "disconnected"
}

const SCAN_FIRMWARE_INTERVAL = 30000

function log(level: LogLevel, message: any, optionalArgs?: any[]): void {
    switch (level) {
        case 'error': console.error(message, optionalArgs || ""); break;
        case 'warn': console.warn(message, optionalArgs || ""); break;
        case 'info': console.info(message, optionalArgs || ""); break;
        case 'debug': console.debug(message, optionalArgs || ""); break;
        default: console.log(message, optionalArgs || ""); break;
    }
}

/**
 * A JACDAC bus manager. This instance maintains the list of devices on the bus.
 */
export class JDBus extends JDNode {
    private _connectionState = BusState.Disconnected;
    private _connectPromise: Promise<void>;
    private _disconnectPromise: Promise<void>;

    private _devices: JDDevice[] = [];
    private _deviceNames: SMap<string> = {};
    private _startTime: number;
    private _gcInterval: any;
    private _minConsolePriority = ConsolePriority.Log;
    private _firmwareBlobs: FirmwareBlob[];

    /**
     * Creates the bus with the given transport
     * @param sendPacket 
     */
    constructor(public options?: BusOptions) {
        super();
        this.options = this.options || {};
        this.options.log = this.options.log || log;
        this.resetTime();
        this.on(DEVICE_ANNOUNCE, () => this.pingLoggers());
    }

    /**
     * Gets the bus connection state.
     */
    get connectionState(): BusState {
        return this._connectionState;
    }

    private setConnectionState(state: BusState) {
        if (this._connectionState !== state) {
            this.log('debug', `${this._connectionState} -> ${state}`)
            console.log({
                connect: this._connectPromise,
                disconnect: this._disconnectPromise
            })
            this._connectionState = state;
            this.emit(CONNECTION_STATE, this._connectionState);
            switch (this._connectionState) {
                case BusState.Connected: this.emit(CONNECT); break;
                case BusState.Connecting: this.emit(CONNECTING); break;
                case BusState.Disconnecting: this.emit(DISCONNECTING); break;
                case BusState.Disconnected: this.emit(DISCONNECT); break;
            }
            this.emit(CHANGE)
        }
    }

    /**
     * Gets a unique identifier for this node in the JACDAC DOM.
     */
    get id(): string {
        return this.nodeKind;
    }

    get name(): string {
        return "bus"
    }

    get qualifiedName(): string {
        return this.name
    }

    get nodeKind(): string {
        return BUS_NODE_NAME
    }

    toString(): string {
        return this.id;
    }

    node(id: string): JDNode {
        const resolve = (): JDNode => {
            const m = /^(?<type>bus|device|service|register|event|field)(:(?<dev>\w+)(:(?<srv>\w+)(:(?<reg>\w+(:(?<idx>\w+))?))?)?)?$/.exec(id)
            if (!m) return undefined;
            const type = m.groups["type"]
            const dev = m.groups["dev"];
            const srv = parseInt(m.groups["srv"], 16);
            const reg = parseInt(m.groups["reg"], 16);
            const idx = parseInt(m.groups["idx"], 16);
            //console.log(type, this.device(dev), this.device(dev)?.service(srv), this.device(dev)?.service(srv)?.register(reg), idx)
            switch (type) {
                case BUS_NODE_NAME: return this;
                case DEVICE_NODE_NAME: return this.device(dev)
                case SERVICE_NODE_NAME: return this.device(dev)?.service(srv)
                case REGISTER_NODE_NAME: return this.device(dev)?.service(srv)?.register(reg);
                case EVENT_NODE_NAME: return this.device(dev)?.service(srv)?.event(reg);
                case FIELD_NODE_NAME: return this.device(dev)?.service(srv)?.register(reg)?.fields[idx];
            }
            this.log('info', `node ${id} not found`)
            return undefined;
        }
        const node = resolve();
        return node;
    }

    private resetTime() {
        this._startTime = Date.now();
        this.emit(CHANGE)
    }

    get timestamp() {
        return Date.now() - this._startTime;
    }

    get minConsolePriority(): ConsolePriority {
        return this._minConsolePriority;
    }

    get parent(): JDNode {
        return undefined;
    }

    protected get logger(): Log {
        return this.options?.log
    }

    set minConsolePriority(priority: ConsolePriority) {
        if (priority !== this._minConsolePriority) {
            this._minConsolePriority = priority;
            this.emit(CHANGE)
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
        const spa = this.options.sendPacketAsync;
        if (!spa)
            return Promise.resolve();

        return spa(p);
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

    get disconnected() {
        return this._connectionState == BusState.Disconnected
    }

    get firmwareBlobs() {
        return this._firmwareBlobs
    }

    set firmwareBlobs(blobs: FirmwareBlob[]) {
        this._firmwareBlobs = blobs;
        this.emit(FIRMWARE_BLOBS_CHANGE)
        this.emit(CHANGE)
    }

    errorHandler(context: string, exception: any) {
        this.log('error', `error ${context} ${exception?.description}`)
        this.emit(ERROR, { context, exception })
        this.emit(CHANGE)
    }

    connectAsync(background?: boolean): Promise<void> {
        // already connected
        if (this.connectionState == BusState.Connected) {
            this.log('debug', `already connected`)
            return Promise.resolve();
        }

        // connecting
        if (!this._connectPromise) {
            // already disconnecting, retry when disconnected
            if (this._disconnectPromise) {
                this.log('debug', `queuing connect after disconnecting`)
                const p = this._disconnectPromise
                this._disconnectPromise = undefined;
                this._connectPromise = p.then(() => this.connectAsync())
            }
            else {
                // starting a fresh connection
                this.log('debug', `connecting`)
                this._connectPromise = Promise.resolve();
                this.setConnectionState(BusState.Connecting)
                if (this.options.connectAsync)
                    this._connectPromise = this._connectPromise.then(() => this.options.connectAsync(background))
                const p = this._connectPromise = this._connectPromise
                    .then(() => {
                        if (p == this._connectPromise) {
                            this._connectPromise = undefined;
                            this.setConnectionState(BusState.Connected)
                        } else {
                            this.log('debug', `connection aborted in flight`)
                        }
                    })
                    .catch(e => {
                        if (p == this._connectPromise) {
                            this._connectPromise = undefined;
                            this.setConnectionState(BusState.Disconnected)
                            this.errorHandler(CONNECT, e);
                        } else {
                            this.log('debug', `connection error aborted in flight`)
                        }
                    })
            }
        } else {
            this.log('debug', `connect with existing promise`)
        }
        return this._connectPromise;
    }

    disconnectAsync(): Promise<void> {
        // already disconnected
        if (this.connectionState == BusState.Disconnected)
            return Promise.resolve();

        if (!this._disconnectPromise) {
            // connection in progress, wait and disconnect when done
            if (this._connectPromise) {
                this.log('debug', `cancelling connection and disconnect`)
                this._connectPromise = undefined;
            }
            this.log('debug', `disconnecting`)
            this._disconnectPromise = Promise.resolve();
            this.setConnectionState(BusState.Disconnecting)
            if (this.options.disconnectAsync)
                this._disconnectPromise = this._disconnectPromise.then(() => this.options.disconnectAsync())
            this._disconnectPromise = this._disconnectPromise
                .catch(e => {
                    this._disconnectPromise = undefined;
                    this.errorHandler(DISCONNECT, e)
                })
                .finally(() => {
                    this._disconnectPromise = undefined;
                    this.setConnectionState(BusState.Disconnected);
                });
        } else {
            this.log('debug', `disconnect with existing promise`)
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
     * Gets the current list of services from all the known devices on the bus
     */
    services(options: { serviceName?: string, serviceClass?: number }): JDService[] {
        return arrayConcatMany(this.devices(options).map(d => d.services(options)))
    }

    /**
     * Gets a device on the bus
     * @param id 
     */
    device(id: string) {
        let d = this._devices.find(d => d.deviceId == id)
        if (!d) {
            this.log('info', `new device ${id}`)
            d = new JDDevice(this, id)
            this._devices.push(d);
            // stable sort
            this._devices.sort((l, r) => strcmp(l.deviceId, r.deviceId))
            this.emit(DEVICE_CONNECT, d);
            this.emit(DEVICE_CHANGE, d);
            this.emit(CHANGE)

            if (!this._gcInterval)
                this._gcInterval = setInterval(() => this.gcDevices(), JD_DEVICE_DISCONNECTED_DELAY);
        }
        return d
    }

    private _debouncedScanFirmwares: () => void;
    setBackgroundFirmwareScans(enabled: boolean) {
        if (enabled) {
            if (!this._debouncedScanFirmwares) {
                this.log('debug', `enabling background firmware scans`)
                this._debouncedScanFirmwares = debounceAsync(async () => {
                    if (this.connected) {
                        this.log('info', `scanning firmwares`)
                        await scanFirmwares(this);
                    }
                }, SCAN_FIRMWARE_INTERVAL)
                this.on(DEVICE_ANNOUNCE, this._debouncedScanFirmwares)
            }
        } else {
            this.log('debug', `disabling background firmware scans`)
            const d = this._debouncedScanFirmwares;
            this._debouncedScanFirmwares = undefined;
            this.off(DEVICE_ANNOUNCE, d)
        }
    }

    private gcDevices() {
        const LOST_DELAY = this.options?.deviceLostDelay || JD_DEVICE_LOST_DELAY;
        const DISCONNECTED_DELAY = this.options?.deviceDisconnectedDelay || JD_DEVICE_DISCONNECTED_DELAY
        const lostCutoff = this.timestamp - LOST_DELAY
        const disconnectedCutoff = this.timestamp - DISCONNECTED_DELAY;
        // cycle through events and disconnect devices that are long gone
        for (let i = 0; i < this._devices.length; ++i) {
            const dev = this._devices[i]
            if (dev.lastSeen < disconnectedCutoff) {
                this._devices.splice(i, 1)
                i--
                this.disconnectDevice(dev)
            }
            else if (dev.lastSeen < lostCutoff) {
                dev.lost = true
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

    private disconnectDevice(dev: JDDevice) {
        dev.disconnect();
        this.emit(DEVICE_DISCONNECT, dev);
        this.emit(DEVICE_CHANGE, dev)
        this.emit(CHANGE)
    }

    /**
     * Ingests and process a packet received from the bus.
     * @param pkt a jacdac packet
     */
    processPacket(pkt: Packet) {
        if (!pkt.multicommand_class)
            pkt.dev = this.device(pkt.device_identifier)
        this.emit(PACKET_PROCESS, pkt)
        let isAnnounce = false
        if (!pkt.dev) {
            // skip
        } else if (pkt.is_command) {
            pkt.dev.processPacket(pkt);
        } else {
            pkt.dev.lastSeen = pkt.timestamp
            if (pkt.service_number == JD_SERVICE_NUMBER_CTRL) {
                if (pkt.service_command == CMD_ADVERTISEMENT_DATA) {
                    isAnnounce = true
                    pkt.dev.processAnnouncement(pkt)
                }
            }
            pkt.dev.processPacket(pkt)
        }
        // don't spam with duplicate advertisement events
        if (isAnnounce) {
            this.emit(PACKET_RECEIVE_ANNOUNCE, pkt)
        } else {
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
}

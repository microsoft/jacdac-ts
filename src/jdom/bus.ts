import Packet from "./packet";
import { JDDevice } from "./device";
import { SMap, debounceAsync, strcmp, arrayConcatMany, anyRandomUint32, toHex } from "./utils";
import {
    ConsolePriority,
    CMD_CONSOLE_SET_MIN_PRIORITY,
    JD_SERVICE_INDEX_CTRL,
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
    JD_DEVICE_LOST_DELAY,
    JD_SERVICE_INDEX_CRC_ACK,
    SELF_ANNOUNCE,
    TIMEOUT,
    LATE,
    PACKET_SEND_DISCONNECT,
    TIMEOUT_DISCONNECT,
    REPORT_UPDATE,
    REGISTER_POLL_REPORT_INTERVAL,
    REGISTER_POLL_REPORT_MAX_INTERVAL,
    REGISTER_OPTIONAL_POLL_COUNT,
    PACKET_PRE_PROCESS,
    STREAMING_DEFAULT_INTERVAL
} from "./constants";
import { serviceClass } from "./pretty";
import { JDNode, Log, LogLevel } from "./node";
import { FirmwareBlob, scanFirmwares } from "./flashing";
import { JDService } from "./service";
import { isConstRegister, isReading, isSensor } from "./spec";
import { SensorReg, SRV_LOGGER } from "../../jacdac-spec/dist/specconstants";

export interface IDeviceNameSettings {
    resolve(device: JDDevice): string;
    // notify namer that the device was renamed
    notifyUpdate(device: JDDevice, name: string): void;
}

export interface PacketTransport {
    sendPacketAsync?: (p: Packet) => Promise<void>;
    connectAsync?: (background?: boolean) => Promise<void>;
    disconnectAsync?: () => Promise<void>;
}

export interface BusOptions {
    deviceLostDelay?: number;
    deviceDisconnectedDelay?: number;
    deviceId?: string;

    parentOrigin?: string;
}

export interface BusHost {
    log?: Log;
    deviceNameSettings?: IDeviceNameSettings;
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
    private _startTime: number;
    private _gcInterval: any;
    private _announceInterval: any;
    private _refreshRegistersInterval: any;
    private _minConsolePriority = ConsolePriority.Log;
    private _firmwareBlobs: FirmwareBlob[];
    private _announcing = false;

    public readonly host: BusHost = {
        log
    }

    /**
     * Creates the bus with the given transport
     * @param sendPacket 
     */
    constructor(public readonly transport: PacketTransport, public options?: BusOptions) {
        super();
        this.options = this.options || {};
        if (!this.options.deviceId) {
            const devId = anyRandomUint32(8);
            for (let i = 0; i < 8; ++i) devId[i] &= 0xff;
            this.options.deviceId = toHex(devId);
        }

        this.resetTime();

        // ping loggers when device connects
        this.pingLoggers = this.pingLoggers.bind(this)
        const debouncedPingLoggers = debounceAsync(this.pingLoggers, 1000)
        this.on(DEVICE_ANNOUNCE, debouncedPingLoggers);
    }

    private startTimers() {
        if (!this._announceInterval)
            this._announceInterval = setInterval(() => {
                if (this.connected)
                    this.emit(SELF_ANNOUNCE);
                this.refreshRegisters();
            }, 499);
        if (!this._refreshRegistersInterval)
            this._refreshRegistersInterval = setInterval(() => this.refreshRegisters(), 50);
        if (!this._gcInterval)
            this._gcInterval = setInterval(() => this.gcDevices(), JD_DEVICE_DISCONNECTED_DELAY);
    }

    private stopTimers() {
        if (this._announceInterval) {
            clearInterval(this._announceInterval);
            this._announceInterval = undefined;
        }
        if (this._refreshRegistersInterval) {
            clearInterval(this._refreshRegistersInterval)
            this._refreshRegistersInterval = undefined;
        }
        if (this._gcInterval) {
            clearInterval(this._gcInterval)
            this._gcInterval = undefined;
        }
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
            this._connectionState = state;
            this.emit(CONNECTION_STATE, this._connectionState);
            switch (this._connectionState) {
                case BusState.Connected: this.emit(CONNECT); break;
                case BusState.Connecting: this.emit(CONNECTING); break;
                case BusState.Disconnecting: this.emit(DISCONNECTING); break;
                case BusState.Disconnected:
                    this.clear();
                    this.emit(DISCONNECT);
                    break;
            }
            this.emit(CHANGE)
        }
    }

    clear() {
        const devs = this._devices;
        if (devs?.length) {
            this._devices = [];
            devs.forEach(dev => {
                dev.disconnect();
                this.emit(DEVICE_DISCONNECT, dev);
                this.emit(DEVICE_CHANGE, dev)
            })
        }
        this.resetTime();
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

    get friendlyName(): string {
        return this.name;
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
        return this.host.log
    }

    set minConsolePriority(priority: ConsolePriority) {
        if (priority !== this._minConsolePriority) {
            this._minConsolePriority = priority;
            this.emit(CHANGE)
        }
    }

    private async pingLoggers() {
        if (this._minConsolePriority < ConsolePriority.Silent) {
            const pkt = Packet.packed(CMD_CONSOLE_SET_MIN_PRIORITY, "i", [this._minConsolePriority]);
            await pkt.sendAsMultiCommandAsync(this, SRV_LOGGER);
        }
    }

    sendPacketAsync(p: Packet) {
        p.timestamp = this.timestamp;
        this.emit(PACKET_SEND, p);

        if (!this.connected) {
            this.emit(PACKET_SEND_DISCONNECT, p);
            return Promise.resolve();
        }
        const spa = this.transport?.sendPacketAsync;
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
        this.log('error', `error ${context} ${exception?.message}\n${exception?.stack}`)
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
                this.startTimers();
                this._connectPromise = Promise.resolve();
                this.setConnectionState(BusState.Connecting)
                if (this.transport?.connectAsync)
                    this._connectPromise = this._connectPromise
                        .then(() => this.transport.connectAsync(background))
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
            if (this.transport?.disconnectAsync)
                this._disconnectPromise = this._disconnectPromise
                    .then(() => this.transport.disconnectAsync())
            this._disconnectPromise = this._disconnectPromise
                .catch(e => {
                    this._disconnectPromise = undefined;
                    this.errorHandler(DISCONNECT, e)
                })
                .finally(() => {
                    this._disconnectPromise = undefined;
                    this.setConnectionState(BusState.Disconnected);
                    this.stopTimers();
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
        let sc = options?.serviceClass > -1 ? options?.serviceClass : serviceClass(options?.serviceName);
        if (sc > -1)
            return this._devices.filter(s => s.hasService(sc));
        else
            return this._devices.slice();
    }

    get children(): JDNode[] {
        return this.devices();
    }

    /**
     * Gets the current list of services from all the known devices on the bus
     */
    services(options?: { serviceName?: string, serviceClass?: number }): JDService[] {
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
            if (this.host.deviceNameSettings)
                d.name = this.host.deviceNameSettings.resolve(d)
            this._devices.push(d);
            // stable sort
            this._devices.sort((l, r) => strcmp(l.deviceId, r.deviceId))
            this.emit(DEVICE_CONNECT, d);
            this.emit(DEVICE_CHANGE, d);
            this.emit(CHANGE)
        }
        return d
    }

    private _debouncedScanFirmwares: () => void;
    setBackgroundFirmwareScans(enabled: boolean) {
        const isSSR = typeof window === "undefined"
        if (isSSR)
            enabled = false;

        if (enabled) {
            if (!this._debouncedScanFirmwares) {
                this._debouncedScanFirmwares = debounceAsync(async () => {
                    if (this.connected) {
                        this.log('info', `scanning firmwares`)
                        await scanFirmwares(this);
                    }
                }, SCAN_FIRMWARE_INTERVAL)
                this.on(DEVICE_ANNOUNCE, this._debouncedScanFirmwares)
            }
        } else {
            if (this._debouncedScanFirmwares) {
                this.log('debug', `disabling background firmware scans`)
                const d = this._debouncedScanFirmwares;
                this._debouncedScanFirmwares = undefined;
                this.off(DEVICE_ANNOUNCE, d)
            }
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
            pkt.device = this.device(pkt.device_identifier)
        this.emit(PACKET_PRE_PROCESS, pkt)
        let isAnnounce = false
        if (!pkt.device) {
            // skip
        } else if (pkt.is_command) {
            if (pkt.device_identifier == this.selfDeviceId) {
                if (pkt.requires_ack) {
                    const ack = Packet.onlyHeader(pkt.crc)
                    ack.service_index = JD_SERVICE_INDEX_CRC_ACK
                    ack.device_identifier = this.selfDeviceId
                    ack.sendReportAsync(this.selfDevice)
                }
            }
            pkt.device.processPacket(pkt);
        } else {
            pkt.device.lastSeen = pkt.timestamp
            if (pkt.service_index == JD_SERVICE_INDEX_CTRL) {
                if (pkt.service_command == CMD_ADVERTISEMENT_DATA) {
                    isAnnounce = true
                    pkt.device.processAnnouncement(pkt)
                }
            }
            pkt.device.processPacket(pkt)
        }
        this.emit(PACKET_PROCESS, pkt)
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

    get selfDeviceId() {
        return this.options.deviceId
    }

    get selfDevice() {
        return this.device(this.selfDeviceId)
    }

    enableAnnounce() {
        if (!this._announcing)
            return;
        this._announcing = true;
        let restartCounter = 0
        this.on(SELF_ANNOUNCE, () => {
            // we do not support any services (at least yet)
            if (restartCounter < 0xf) restartCounter++
            const pkt = Packet.packed(CMD_ADVERTISEMENT_DATA, "I", [restartCounter | 0x100])
            pkt.service_index = JD_SERVICE_INDEX_CTRL
            pkt.device_identifier = this.selfDeviceId
            pkt.sendReportAsync(this.selfDevice)
        })
    }

    /**
     * Cycles through all known registers and refreshes the once that have REPORT_UPDATE registered
     */
    private async refreshRegisters() {
        const devices = this.devices()
            .filter(device => !device.lost); // don't try lost devices
        if (!devices.length)
            return; // no devices, we're done
        // collect registers
        const registers = arrayConcatMany(devices
            .map(device => arrayConcatMany(
                device.services()
                    .map(service => service.registers()
                        // someone is listening for reports
                        .filter(reg => reg.listenerCount(REPORT_UPDATE) > 0)
                        // ask if data is missing or non-const
                        .filter(reg => !reg.data || !isConstRegister(reg.specification))
                        // stop asking optional registers
                        .filter(reg => !reg.specification?.optional || reg.lastGetAttempts < REGISTER_OPTIONAL_POLL_COUNT)
                    )
            )
            )
        )

        //console.log(`auto-refresh`, registers)
        for (const register of registers) {
            // streaming register? use streaming sample
            if (isReading(register.specification) && isSensor(register.service.specification)) {
                // compute refresh interval
                const intervalRegister = register.service.register(SensorReg.StreamingInterval);
                let interval = intervalRegister.intValue;
                if (!interval) {
                    // console.log(`auto-refresh - update interval`, register)
                    // no interval data
                    // use preferred interval data or default to 50
                    const preferredInterval = register.service.register(SensorReg.StreamingPreferredInterval);
                    interval = preferredInterval?.intValue || STREAMING_DEFAULT_INTERVAL;
                    await intervalRegister.sendGetAsync();
                }
                const samplesRegister = register.service.register(SensorReg.StreamingSamples);
                const age = this.timestamp - samplesRegister.lastSetTimestamp;
                // need to figure out when we asked for streaming
                const midAge = interval * 0xff / 2;
                // compute if half aged
                if (age > midAge) {
                    //console.log(`auto-refresh - restream`, register)
                    await samplesRegister.sendSetIntAsync(0xff);
                }
            } // regular register, ping if data is old
            else {
                const age = this.timestamp - register.lastGetTimestamp;
                const backoff = register.lastGetAttempts;
                const expiration = Math.min(REGISTER_POLL_REPORT_MAX_INTERVAL, REGISTER_POLL_REPORT_INTERVAL * (1 << backoff))
                if (age > expiration) {
                    //console.log(`bus: poll ${register.id}`, register, age, backoff, expiration)
                    await register.sendGetAsync();
                }
            }
        }
    }

    /**
     * Runs a promise with a timeout. Returns undefined if timeout happens before of disconnection.
     * @param timeout 
     * @param p 
     */
    withTimeout<T>(timeout: number, p: Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            let done = false
            let tid = setTimeout(() => {
                if (!done) {
                    done = true
                    if (!this.connected) {
                        // the bus got disconnected so all operation will
                        // time out going further
                        this.emit(TIMEOUT_DISCONNECT)
                        resolve(undefined);
                    }
                    else {
                        // the command timed out
                        this.emit(TIMEOUT)
                        this.emit(ERROR, "Timeout (" + timeout + "ms)");
                        resolve(undefined);
                    }
                }
            }, timeout)
            p.then(v => {
                if (!done) {
                    done = true
                    resolve(v)
                } else {
                    // we already gave up
                    this.emit(LATE)
                }
            }, e => {
                if (!done) {
                    done = true
                    reject(e)
                }
            })
        })
    }
}

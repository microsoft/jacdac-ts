import Packet from "./packet"
import { JDDevice } from "./device"
import {
    debounceAsync,
    strcmp,
    arrayConcatMany,
    anyRandomUint32,
    toHex,
} from "./utils"
import {
    JD_SERVICE_INDEX_CTRL,
    CMD_ADVERTISEMENT_DATA,
    DEVICE_ANNOUNCE,
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
    STREAMING_DEFAULT_INTERVAL,
    REGISTER_POLL_FIRST_REPORT_INTERVAL,
    DEVICE_HOST_ADDED,
    DEVICE_HOST_REMOVED,
    REFRESH,
    EVENT,
    ROLE_MANAGER_CHANGE,
} from "./constants"
import { serviceClass } from "./pretty"
import { JDNode, Log, LogLevel } from "./node"
import {
    FirmwareBlob,
    scanFirmwares,
    sendStayInBootloaderCommand,
} from "./flashing"
import { JDService } from "./service"
import { isConstRegister, isReading, isSensor } from "./spec"
import {
    ControlReg,
    LoggerPriority,
    LoggerReg,
    RoleManagerCmd,
    SensorReg,
    SRV_CONTROL,
    SRV_LOGGER,
    SRV_REAL_TIME_CLOCK,
    SystemEvent,
    SystemReg,
} from "../../src/jdom/constants"
import DeviceHost from "./devicehost"
import RealTimeClockServiceHost from "../hosts/realtimeclockservicehost"
import { JDEventSource } from "./eventsource"
import { JDServiceClient } from "./serviceclient"
import { InPipeReader } from "./pipes"
import { jdunpack } from "./pack"
import { SRV_ROLE_MANAGER } from "../../jacdac-spec/dist/specconstants"

export interface PacketTransport {
    sendPacketAsync?: (p: Packet) => Promise<void>
    connectAsync?: (background?: boolean) => Promise<void>
    disconnectAsync?: () => Promise<void>
}

export interface BusOptions {
    deviceLostDelay?: number
    deviceDisconnectedDelay?: number
    deviceId?: string

    parentOrigin?: string
}

export interface BusHost {
    log?: Log
}

export interface Error {
    context: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exception: any
}

export enum BusState {
    Connected = "connected",
    Connecting = "connecting",
    Disconnecting = "disconnecting",
    Disconnected = "disconnected",
}

const SCAN_FIRMWARE_INTERVAL = 30000

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
function log(level: LogLevel, message: any, optionalArgs?: any[]): void {
    switch (level) {
        case "error":
            console.error(message, optionalArgs || "")
            break
        case "warn":
            console.warn(message, optionalArgs || "")
            break
        case "info":
            console.info(message, optionalArgs || "")
            break
        case "debug":
            console.debug(message, optionalArgs || "")
            break
        default:
            console.log(message, optionalArgs || "")
            break
    }
}

export interface DeviceFilter {
    serviceName?: string
    serviceClass?: number
    ignoreSelf?: boolean
    announced?: boolean
    ignoreSimulators?: boolean
    firmwareIdentifier?: boolean
}
export interface BusStats {
    packets: number
    announce: number
    acks: number
    bytes: number
}

export class BusStatsMonitor extends JDEventSource {
    private readonly _prev: BusStats[] = Array(10)
        .fill(0)
        .map(() => ({
            packets: 0,
            announce: 0,
            acks: 0,
            bytes: 0,
        }))
    private _previ = 0
    private _temp: BusStats = {
        packets: 0,
        announce: 0,
        acks: 0,
        bytes: 0,
    }

    constructor(readonly bus: JDBus) {
        super()
        this.bus.on(PACKET_SEND, this.handlePacketSend.bind(this))
        this.bus.on(PACKET_PROCESS, this.handlePacketProcess.bind(this))
        this.bus.on(SELF_ANNOUNCE, this.handleSelfAnnounce.bind(this))
    }

    get current(): BusStats {
        const r: BusStats = {
            packets: 0,
            announce: 0,
            acks: 0,
            bytes: 0,
        }
        const n = this._prev.length
        for (let i = 0; i < this._prev.length; ++i) {
            const p = this._prev[i]
            r.packets += p.packets
            r.announce += p.announce
            r.acks += p.acks
            r.bytes += p.bytes
        }
        // announce every 500ms
        const n2 = n / 2
        r.packets /= n2
        r.announce /= n2
        r.acks /= n2
        r.bytes /= n2
        return r
    }

    private accumulate(pkt: Packet) {
        this._temp.packets++
        this._temp.bytes += (pkt.header?.length || 0) + (pkt.data?.length || 0)
        if (pkt.isCRCAck) this._temp.acks++
    }

    private handleSelfAnnounce() {
        const changed =
            JSON.stringify(this._prev) !== JSON.stringify(this._temp)
        this._prev[this._previ] = this._temp
        this._previ = (this._previ + 1) % this._prev.length
        this._temp = {
            packets: 0,
            announce: 0,
            acks: 0,
            bytes: 0,
        }
        if (changed) this.emit(CHANGE)
    }

    private handlePacketSend(pkt: Packet) {
        this.accumulate(pkt)
    }

    private handlePacketProcess(pkt: Packet) {
        this.accumulate(pkt)
    }
}

export class BusRoleManagerClient extends JDServiceClient {
    private _roles: { [deviceIdServiceIndex: string]: string } = {}
    private _needRefresh = true;

    public readonly startRefreshRoles: () => void;

    constructor(service: JDService) {
        super(service)
        const changeEvent = service.event(SystemEvent.Change)

        // always debounce refresh roles
        this.startRefreshRoles = debounceAsync(this.refreshRoles.bind(this), 500);

        // role manager emits change events
        const throttledHandleChange = debounceAsync(
            this.handleChange.bind(this),
            500
        )
        this.mount(changeEvent.subscribe(EVENT, throttledHandleChange))
        // assign roles when need device enter the bus
        this.mount(
            this.bus.subscribe(DEVICE_ANNOUNCE, this.assignRoles.bind(this))
        )
        // unmount when device is removed
        this.mount(
            service.device.subscribe(DISCONNECT, () => {
                if (this.bus.roleManager === this.service)
                    this.bus.roleManager = undefined
            })
        )
        // clear on unmount
        this.mount(this.clearRoles.bind(this))
        // retry to get roles on every self-announce
        this.mount(this.bus.subscribe(SELF_ANNOUNCE, this.handleSelfAnnounce.bind(this)));
    }

    private handleSelfAnnounce() {
        if (this._needRefresh)
            this.startRefreshRoles();
    }

    private async handleChange() {
        console.debug(`role manager change event`)
        this.startRefreshRoles()
    }

    private async refreshRoles() {
        await this.collectRoles()
        this.assignRoles()
    }

    private async collectRoles() {
        this.log("refresh roles")
        try {
            const inp = new InPipeReader(this.bus)
            await this.service.sendPacketAsync(
                inp.openCommand(RoleManagerCmd.ListRequiredRoles),
                true
            )
            // collect all roles
            const roles: { [deviceIdServiceIndex: string]: string } = {}
            for (const buf of await inp.readData()) {
                const [devidbuf, serviceClass, serviceIdx, role] = jdunpack<
                    [Uint8Array, number, number, string]
                >(buf, "b[8] u32 u8 s")
                const devid = toHex(devidbuf)
                roles[`${devid}:${serviceIdx}`] = role
            }
            // store result
            this._roles = roles
            this._needRefresh = false;
            console.debug(`roles`, { roles: this._roles })
        } catch (e) {
            this.log(`refresh failed`)
            this._needRefresh = true;
            console.error(e)
        }
    }

    static unroledSrvs = [
        SRV_CONTROL,
        SRV_ROLE_MANAGER,
        SRV_LOGGER,
    ]

    private assignRoles() {
        console.debug("assign roles", { roles: this._roles })
        this.bus.services()
            .filter(srv => BusRoleManagerClient.unroledSrvs.indexOf(srv.serviceClass) < 0)
            .forEach(srv => this.assignRole(srv))
    }

    private assignRole(service: JDService) {
        const key = `${service.device.deviceId}:${service.serviceIndex}`
        const role = this._roles[key]
        console.debug(`role ${key} -> ${role}`, { service })
        service.role = role
    }

    private clearRoles() {
        this.bus.services().forEach(srv => (srv.role = undefined))
    }
}

/**
 * A Jacdac bus manager. This instance maintains the list of devices on the bus.
 */
export class JDBus extends JDNode {
    private _connectionState = BusState.Disconnected
    private _connectPromise: Promise<void>
    private _disconnectPromise: Promise<void>

    private _devices: JDDevice[] = []
    private _startTime: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _gcInterval: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _announceInterval: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _safeBootInterval: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _refreshRegistersInterval: any
    private _roleManagerClient: BusRoleManagerClient

    private _minLoggerPriority = LoggerPriority.Log
    private _firmwareBlobs: FirmwareBlob[]
    private _announcing = false
    private _gcDevicesEnabled = 0

    private _deviceHosts: DeviceHost[] = []

    public readonly host: BusHost = {
        log,
    }

    public readonly stats: BusStatsMonitor

    /**
     * Creates the bus with the given transport
     * @param sendPacket
     */
    constructor(
        public readonly transport: PacketTransport,
        public options?: BusOptions
    ) {
        super()
        this.options = this.options || {}
        if (!this.options.deviceId) {
            const devId = anyRandomUint32(8)
            for (let i = 0; i < 8; ++i) devId[i] &= 0xff
            this.options.deviceId = toHex(devId)
        }

        this.stats = new BusStatsMonitor(this)
        this.resetTime()

        // tell loggers to send data
        this.on(
            DEVICE_ANNOUNCE,
            debounceAsync(this.pingLoggers.bind(this), 1000)
        )
        // tell RTC clock the computer time
        this.on(DEVICE_ANNOUNCE, this.handleRealTimeClockSync.bind(this))
        // grab the default role manager
        this.on(DEVICE_ANNOUNCE, this.handleRoleManager.bind(this))

        // start all timers
        this.start()
    }

    start() {
        if (!this._announceInterval)
            this._announceInterval = setInterval(
                () => this.emit(SELF_ANNOUNCE),
                499
            )
        if (!this._refreshRegistersInterval)
            this._refreshRegistersInterval = setInterval(
                this.refreshRegisters.bind(this),
                50
            )
        if (!this._gcInterval)
            this._gcInterval = setInterval(
                () => this.gcDevices(),
                JD_DEVICE_DISCONNECTED_DELAY
            )
    }

    stop() {
        if (this._announceInterval) {
            clearInterval(this._announceInterval)
            this._announceInterval = undefined
        }
        this.safeBoot = false
        if (this._refreshRegistersInterval) {
            clearInterval(this._refreshRegistersInterval)
            this._refreshRegistersInterval = undefined
        }
        if (this._gcInterval) {
            clearInterval(this._gcInterval)
            this._gcInterval = undefined
        }
    }

    get safeBoot() {
        return !!this._safeBootInterval
    }

    set safeBoot(enabled: boolean) {
        if (enabled && !this._safeBootInterval) {
            this._safeBootInterval = setInterval(() => {
                // don't send message if any device is flashing
                if (this._devices.some(d => d.flashing)) return
                sendStayInBootloaderCommand(this)
            }, 50)
            this.emit(CHANGE)
        } else if (!enabled && this._safeBootInterval) {
            clearInterval(this._safeBootInterval)
            this._safeBootInterval = undefined
            this.emit(CHANGE)
        }
    }

    /**
     * Gets the bus connection state.
     */
    get connectionState(): BusState {
        return this._connectionState
    }

    private setConnectionState(state: BusState) {
        if (this._connectionState !== state) {
            this.log("debug", `${this._connectionState} -> ${state}`)
            this._connectionState = state
            this.emit(CONNECTION_STATE, this._connectionState)
            switch (this._connectionState) {
                case BusState.Connected:
                    this.emit(CONNECT)
                    break
                case BusState.Connecting:
                    this.emit(CONNECTING)
                    break
                case BusState.Disconnecting:
                    this.emit(DISCONNECTING)
                    break
                case BusState.Disconnected:
                    this.clear()
                    this.emit(DISCONNECT)
                    break
            }
            this.emit(CHANGE)
        }
    }

    clear() {
        // clear hosts
        if (this._deviceHosts?.length) {
            this._deviceHosts.forEach(host => (host.bus = undefined))
            this._deviceHosts = []
        }

        // clear devices
        const devs = this._devices
        if (devs?.length) {
            this._devices = []
            devs.forEach(dev => {
                dev.disconnect()
                this.emit(DEVICE_DISCONNECT, dev)
                this.emit(DEVICE_CHANGE, dev)
            })
        }
        this.resetTime()
    }

    /**
     * Gets a unique identifier for this node in the Jacdac DOM.
     */
    get id(): string {
        return this.nodeKind
    }

    get name(): string {
        return "bus"
    }

    get friendlyName(): string {
        return this.name
    }

    get qualifiedName(): string {
        return this.name
    }

    get nodeKind(): string {
        return BUS_NODE_NAME
    }

    get roleManager(): JDService {
        return this._roleManagerClient?.service
    }

    set roleManager(service: JDService) {
        console.log(`set role manager`, { service })
        // clean if needed
        if (
            this._roleManagerClient &&
            this._roleManagerClient.service !== service
        ) {
            console.debug("unmount role manager")
            this._roleManagerClient.unmount()
            this._roleManagerClient = undefined
        }

        // allocate new manager
        if (service && service !== this._roleManagerClient?.service) {
            console.debug("mount role manager")
            this._roleManagerClient = new BusRoleManagerClient(service)
            this.emit(ROLE_MANAGER_CHANGE)
            this.emit(CHANGE)
            this._roleManagerClient.startRefreshRoles()
        }
    }

    toString(): string {
        return this.id
    }

    node(id: string): JDNode {
        const resolve = (): JDNode => {
            const m = /^(?<type>bus|device|service|register|event|field)(:(?<dev>\w+)(:(?<srv>\w+)(:(?<reg>\w+(:(?<idx>\w+))?))?)?)?$/.exec(
                id
            )
            if (!m) return undefined
            const type = m.groups["type"]
            const dev = m.groups["dev"]
            const srv = parseInt(m.groups["srv"], 16)
            const reg = parseInt(m.groups["reg"], 16)
            const idx = parseInt(m.groups["idx"], 16)
            //console.log(type, this.device(dev), this.device(dev)?.service(srv), this.device(dev)?.service(srv)?.register(reg), idx)
            switch (type) {
                case BUS_NODE_NAME:
                    return this
                case DEVICE_NODE_NAME:
                    return this.device(dev)
                case SERVICE_NODE_NAME:
                    return this.device(dev)?.service(srv)
                case REGISTER_NODE_NAME:
                    return this.device(dev)?.service(srv)?.register(reg)
                case EVENT_NODE_NAME:
                    return this.device(dev)?.service(srv)?.event(reg)
                case FIELD_NODE_NAME:
                    return this.device(dev)?.service(srv)?.register(reg)
                        ?.fields[idx]
            }
            this.log("info", `node ${id} not found`)
            return undefined
        }
        const node = resolve()
        return node
    }

    private resetTime() {
        this._startTime = Date.now()
        this.emit(CHANGE)
    }

    get timestamp(): number {
        return Date.now() - this._startTime
    }

    get minLoggerPriority(): LoggerPriority {
        return this._minLoggerPriority
    }

    set minLoggerPriority(priority: LoggerPriority) {
        if (priority !== this._minLoggerPriority) {
            this._minLoggerPriority = priority
            this.emit(CHANGE)
        }
    }

    get parent(): JDNode {
        return undefined
    }

    protected get logger(): Log {
        return this.host.log
    }

    private async pingLoggers() {
        if (this._minLoggerPriority < LoggerPriority.Silent) {
            const pkt = Packet.jdpacked<[LoggerPriority]>(
                0x2000 | LoggerReg.MinPriority,
                "i32",
                [this._minLoggerPriority]
            )
            await pkt.sendAsMultiCommandAsync(this, SRV_LOGGER)
        }
    }
    private async handleRealTimeClockSync(device: JDDevice) {
        // tell time to the RTC clocks
        if (device.hasService(SRV_REAL_TIME_CLOCK))
            await RealTimeClockServiceHost.syncTime(this)
    }

    private handleRoleManager(device: JDDevice) {
        // auto allocate the first role manager
        console.log("handle role manager", {
            device,
            hasRoleManager: device.hasService(SRV_ROLE_MANAGER),
            SRV_ROLE_MANAGER,
        })
        if (!this._roleManagerClient && device.hasService(SRV_ROLE_MANAGER)) {
            const [service] = device.services({
                serviceClass: SRV_ROLE_MANAGER,
            })
            this.roleManager = service
        }
    }

    sendPacketAsync(p: Packet) {
        p.timestamp = this.timestamp
        this.emit(PACKET_SEND, p)

        if (!this.connected) {
            this.emit(PACKET_SEND_DISCONNECT, p)
            return Promise.resolve()
        }
        const spa = this.transport?.sendPacketAsync
        if (!spa) return Promise.resolve()
        return spa(p)
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
        this._firmwareBlobs = blobs
        this.emit(FIRMWARE_BLOBS_CHANGE)
        this.emit(CHANGE)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errorHandler(context: string, exception: any) {
        this.log(
            "error",
            `error ${context} ${exception?.message}\n${exception?.stack}`
        )
        this.emit(ERROR, { context, exception })
        this.emit(CHANGE)
    }

    connectAsync(background?: boolean): Promise<void> {
        // already connected
        if (this.connectionState == BusState.Connected) {
            this.log("debug", `already connected`)
            return Promise.resolve()
        }

        // connecting
        if (!this._connectPromise) {
            // already disconnecting, retry when disconnected
            if (this._disconnectPromise) {
                this.log("debug", `queuing connect after disconnecting`)
                const p = this._disconnectPromise
                this._disconnectPromise = undefined
                this._connectPromise = p.then(() => this.connectAsync())
            } else {
                // starting a fresh connection
                this.log("debug", `connecting`)
                this._connectPromise = Promise.resolve()
                this.setConnectionState(BusState.Connecting)
                if (this.transport?.connectAsync)
                    this._connectPromise = this._connectPromise.then(() =>
                        this.transport.connectAsync(background)
                    )
                const p = (this._connectPromise = this._connectPromise
                    .then(() => {
                        if (p == this._connectPromise) {
                            this._connectPromise = undefined
                            this.setConnectionState(BusState.Connected)
                        } else {
                            this.log("debug", `connection aborted in flight`)
                        }
                    })
                    .catch(e => {
                        if (p == this._connectPromise) {
                            this._connectPromise = undefined
                            this.setConnectionState(BusState.Disconnected)
                            if (!background) this.errorHandler(CONNECT, e)
                            else this.log("debug", "background connect failed")
                        } else {
                            this.log(
                                "debug",
                                `connection error aborted in flight`
                            )
                        }
                    }))
            }
        } else {
            this.log("debug", `connect with existing promise`)
        }
        return this._connectPromise
    }

    disconnectAsync(): Promise<void> {
        // already disconnected
        if (this.connectionState == BusState.Disconnected)
            return Promise.resolve()

        if (!this._disconnectPromise) {
            // connection in progress, wait and disconnect when done
            if (this._connectPromise) {
                this.log("debug", `cancelling connection and disconnect`)
                this._connectPromise = undefined
            }
            this.log("debug", `disconnecting`)
            this._disconnectPromise = Promise.resolve()
            this.setConnectionState(BusState.Disconnecting)
            if (this.transport?.disconnectAsync)
                this._disconnectPromise = this._disconnectPromise.then(() =>
                    this.transport.disconnectAsync()
                )
            this._disconnectPromise = this._disconnectPromise
                .catch(e => {
                    this._disconnectPromise = undefined
                    this.errorHandler(DISCONNECT, e)
                })
                .finally(() => {
                    this._disconnectPromise = undefined
                    this.setConnectionState(BusState.Disconnected)
                })
        } else {
            this.log("debug", `disconnect with existing promise`)
        }
        return this._disconnectPromise
    }

    /**
     * Gets the current list of known devices on the bus
     */
    devices(options?: DeviceFilter) {
        if (options?.serviceName && options?.serviceClass > -1)
            throw Error("serviceClass and serviceName cannot be used together")
        const sc =
            options?.serviceClass > -1
                ? options?.serviceClass
                : serviceClass(options?.serviceName)

        let r = this._devices.slice(0)
        if (sc > -1) r = r.filter(s => s.hasService(sc))
        if (options?.ignoreSelf)
            r = r.filter(s => s.deviceId !== this.selfDeviceId)
        if (options?.announced) r = r.filter(s => s.announced)
        if (options?.ignoreSimulators)
            r = r.filter(r => !this.deviceHost(r.deviceId))
        if (options?.firmwareIdentifier)
            r = r.filter(r => !!r.firmwareIdentifier)
        return r
    }

    /**
     * Gets the current list of device hosts on the bus
     */
    deviceHosts(): DeviceHost[] {
        return this._deviceHosts.slice(0)
    }

    /**
     * Get a device host for a given device
     * @param deviceId
     */
    deviceHost(deviceId: string) {
        return this._deviceHosts.find(d => d.deviceId === deviceId)
    }

    /**
     * Adds the device host to the bus
     * @param deviceHost
     */
    addDeviceHost(deviceHost: DeviceHost) {
        if (deviceHost && this._deviceHosts.indexOf(deviceHost) < 0) {
            this._deviceHosts.push(deviceHost)
            deviceHost.bus = this

            this.emit(DEVICE_HOST_ADDED)
            this.emit(CHANGE)
        }

        return this.device(deviceHost.deviceId)
    }

    /**
     * Adds the device host to the bus
     * @param deviceHost
     */
    removeDeviceHost(deviceHost: DeviceHost) {
        if (!deviceHost) return

        const i = this._deviceHosts.indexOf(deviceHost)
        if (i > -1) {
            // remove device as well
            const devi = this._devices.findIndex(
                d => d.deviceId === deviceHost.deviceId
            )
            if (devi > -1) {
                const dev = this._devices[devi]
                this._devices.splice(devi, 1)
                dev.disconnect()
                this.emit(DEVICE_DISCONNECT, dev)
                this.emit(DEVICE_CHANGE, dev)
            }

            // remove host
            this._deviceHosts.splice(i, 1)
            deviceHost.bus = undefined
            this.emit(DEVICE_HOST_REMOVED)

            // removed host
            this.emit(CHANGE)
        }
    }

    get children(): JDNode[] {
        return this.devices()
    }

    /**
     * Gets the current list of services from all the known devices on the bus
     */
    services(options?: {
        serviceName?: string
        serviceClass?: number
        specification?: boolean
    }): JDService[] {
        return arrayConcatMany(
            this.devices(options).map(d => d.services(options))
        )
    }

    /**
     * Gets a device on the bus
     * @param id
     */
    device(id: string) {
        let d = this._devices.find(d => d.deviceId == id)
        if (!d) {
            this.log("info", `new device ${id}`)
            if (this.devicesFrozen) {
                this.log(`info`, `devices frozen, dropping ${id}`)
                return undefined
            }
            d = new JDDevice(this, id)
            this._devices.push(d)
            // stable sort
            this._devices.sort((l, r) => strcmp(l.deviceId, r.deviceId))
            this.emit(DEVICE_CONNECT, d)
            this.emit(DEVICE_CHANGE, d)
            this.emit(CHANGE)
        }
        return d
    }

    private _debouncedScanFirmwares: () => void
    setBackgroundFirmwareScans(enabled: boolean) {
        const isSSR = typeof window === "undefined"
        if (isSSR) enabled = false

        if (enabled) {
            if (!this._debouncedScanFirmwares) {
                this._debouncedScanFirmwares = debounceAsync(async () => {
                    if (this.connected) {
                        this.log("info", `scanning firmwares`)
                        await scanFirmwares(this)
                    }
                }, SCAN_FIRMWARE_INTERVAL)
                this.on(DEVICE_ANNOUNCE, this._debouncedScanFirmwares)
            }
        } else {
            if (this._debouncedScanFirmwares) {
                this.log("debug", `disabling background firmware scans`)
                const d = this._debouncedScanFirmwares
                this._debouncedScanFirmwares = undefined
                this.off(DEVICE_ANNOUNCE, d)
            }
        }
    }

    freezeDevices() {
        this._gcDevicesEnabled++
    }

    unfreezeDevices() {
        this._gcDevicesEnabled = Math.max(0, this._gcDevicesEnabled - 1)
    }

    get devicesFrozen() {
        return this._gcDevicesEnabled > 0
    }

    private gcDevices() {
        if (this.devicesFrozen) {
            this.log("debug", "devices frozen")
            return
        }

        const LOST_DELAY = this.options?.deviceLostDelay || JD_DEVICE_LOST_DELAY
        const DISCONNECTED_DELAY =
            this.options?.deviceDisconnectedDelay ||
            JD_DEVICE_DISCONNECTED_DELAY
        const lostCutoff = this.timestamp - LOST_DELAY
        const disconnectedCutoff = this.timestamp - DISCONNECTED_DELAY

        // cycle through events and disconnect devices that are long gone
        for (let i = 0; i < this._devices.length; ++i) {
            const dev = this._devices[i]

            // don't gc traces
            if (dev.replay) continue

            if (dev.lastSeen < disconnectedCutoff) {
                this._devices.splice(i, 1)
                i--
                this.disconnectDevice(dev)
            } else if (dev.lastSeen < lostCutoff) {
                dev.lost = true
            }
        }
    }

    private disconnectDevice(dev: JDDevice) {
        dev.disconnect()
        this.emit(DEVICE_DISCONNECT, dev)
        this.emit(DEVICE_CHANGE, dev)
        this.emit(CHANGE)
    }

    /**
     * Ingests and process a packet received from the bus.
     * @param pkt a jacdac packet
     */
    processPacket(pkt: Packet) {
        if (!pkt.isMultiCommand && !pkt.device) {
            pkt.device = this.device(pkt.deviceIdentifier)
            // check if devices are frozen
            if (!pkt.device) return
        }
        this.emit(PACKET_PRE_PROCESS, pkt)
        let isAnnounce = false
        if (!pkt.device) {
            // skip
        } else if (pkt.isCommand) {
            if (pkt.deviceIdentifier == this.selfDeviceId) {
                if (pkt.requiresAck) {
                    const ack = Packet.onlyHeader(pkt.crc)
                    ack.serviceIndex = JD_SERVICE_INDEX_CRC_ACK
                    ack.deviceIdentifier = this.selfDeviceId
                    ack.sendReportAsync(this.selfDevice)
                }
            }
            pkt.device.processPacket(pkt)
        } else {
            pkt.device.lastSeen = pkt.timestamp
            if (pkt.serviceIndex == JD_SERVICE_INDEX_CTRL) {
                if (pkt.serviceCommand == CMD_ADVERTISEMENT_DATA) {
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
            if (pkt.isEvent) this.emit(PACKET_EVENT, pkt)
            else if (pkt.isReport) this.emit(PACKET_REPORT, pkt)
        }
    }

    get selfDeviceId() {
        return this.options.deviceId
    }

    get selfDevice() {
        return this.device(this.selfDeviceId)
    }

    enableAnnounce() {
        if (!this._announcing) return
        this._announcing = true
        let restartCounter = 0
        this.on(SELF_ANNOUNCE, () => {
            // we do not support any services (at least yet)
            if (restartCounter < 0xf) restartCounter++
            const pkt = Packet.jdpacked<[number]>(
                CMD_ADVERTISEMENT_DATA,
                "u32",
                [restartCounter | 0x100]
            )
            pkt.serviceIndex = JD_SERVICE_INDEX_CTRL
            pkt.deviceIdentifier = this.selfDeviceId
            pkt.sendReportAsync(this.selfDevice)
        })
    }

    /**
     * Cycles through all known registers and refreshes the once that have REPORT_UPDATE registered
     */
    private refreshRegisters() {
        const devices = this._devices.filter(
            device => device.announced && !device.lost
        ) // don't try lost devices or devices flashing

        // skip if no devices or any device is currently flashing
        if (!devices.length || devices.some(dev => dev.flashing)) return // no devices, we're done

        // collect registers
        const registers = arrayConcatMany(
            devices.map(device =>
                arrayConcatMany(
                    device.services({ specification: true }).map(service =>
                        service
                            .registers()
                            // someone is listening for reports
                            .filter(reg => reg.listenerCount(REPORT_UPDATE) > 0)
                            // ask if data is missing or non-const/status code
                            .filter(
                                reg =>
                                    !reg.data ||
                                    !(
                                        isConstRegister(reg.specification) ||
                                        reg.code === SystemReg.StatusCode ||
                                        reg.code === SystemReg.ReadingError
                                    )
                            )
                            // double double-query status light
                            .filter(
                                reg =>
                                    !reg.data ||
                                    !(
                                        service.serviceClass === SRV_CONTROL &&
                                        reg.code === ControlReg.StatusLight
                                    )
                            )
                            // stop asking optional registers
                            .filter(
                                reg =>
                                    !reg.specification?.optional ||
                                    reg.lastGetAttempts <
                                        REGISTER_OPTIONAL_POLL_COUNT
                            )
                    )
                )
            )
        )

        // refresh values
        for (const register of registers) {
            const { service, specification } = register
            const noDataYet = !register.data
            const age = this.timestamp - register.lastGetTimestamp
            const backoff = register.lastGetAttempts

            // streaming register? use streaming sample
            if (isReading(specification) && isSensor(service.specification)) {
                // compute refresh interval
                const intervalRegister = service.register(
                    SensorReg.StreamingInterval
                )
                let interval = intervalRegister?.intValue
                // no interval data
                if (interval === undefined) {
                    // use preferred interval data or default to 50
                    const preferredInterval = service.register(
                        SensorReg.StreamingPreferredInterval
                    )
                    interval = preferredInterval?.intValue
                    if (intervalRegister)
                        // all async
                        intervalRegister.sendGetAsync()
                }
                // still no interval data use from spec or default
                if (interval === undefined)
                    interval =
                        specification.preferredInterval ||
                        STREAMING_DEFAULT_INTERVAL
                const samplesRegister = service.register(
                    SensorReg.StreamingSamples
                )
                const samplesLastSetTimesamp = samplesRegister?.lastSetTimestamp
                if (samplesLastSetTimesamp !== undefined) {
                    const age =
                        this.timestamp - samplesRegister.lastSetTimestamp
                    // need to figure out when we asked for streaming
                    const midAge = (interval * 0xff) / 2
                    // compute if half aged
                    if (age > midAge) {
                        //console.log(`auto-refresh - restream`, register)
                        samplesRegister.sendSetPackedAsync("u8", [0xff])
                    }
                }

                // first query, get data asap once per second
                if (noDataYet && age > 1000) register.sendGetAsync()
            } // regular register, ping if data is old
            else {
                const expiration = Math.min(
                    REGISTER_POLL_REPORT_MAX_INTERVAL,
                    (noDataYet
                        ? REGISTER_POLL_FIRST_REPORT_INTERVAL
                        : REGISTER_POLL_REPORT_INTERVAL) *
                        (1 << backoff)
                )
                if (age > expiration) {
                    //console.log(`bus: poll ${register.id}`, register, age, backoff, expiration)
                    register.sendGetAsync()
                }
            }
        }

        // apply streaming samples to device hosts
        this._deviceHosts.map(host => host.emit(REFRESH))
    }

    /**
     * Runs a promise with a timeout. Returns undefined if timeout happens before of disconnection.
     * @param timeout
     * @param p
     */
    withTimeout<T>(timeout: number, p: Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            let done = false
            const tid = setTimeout(() => {
                if (!done) {
                    done = true
                    if (!this.connected) {
                        // the bus got disconnected so all operation will
                        // time out going further
                        this.emit(TIMEOUT_DISCONNECT)
                        resolve(undefined)
                    } else {
                        // the command timed out
                        this.emit(TIMEOUT)
                        this.emit(ERROR, "Timeout (" + timeout + "ms)")
                        resolve(undefined)
                    }
                }
            }, timeout)
            p.then(
                v => {
                    if (!done) {
                        done = true
                        clearTimeout(tid)
                        resolve(v)
                    } else {
                        // we already gave up
                        this.emit(LATE)
                    }
                },
                e => {
                    if (!done) {
                        done = true
                        clearTimeout(tid)
                        reject(e)
                    }
                }
            )
        })
    }
}

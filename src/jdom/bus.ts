import Packet from "./packet"
import JDDevice from "./device"
import { debounceAsync, strcmp, arrayConcatMany } from "./utils"
import {
    JD_SERVICE_INDEX_CTRL,
    CMD_ADVERTISEMENT_DATA,
    DEVICE_ANNOUNCE,
    PACKET_SEND,
    ERROR,
    CONNECTING,
    DEVICE_CONNECT,
    DEVICE_DISCONNECT,
    PACKET_RECEIVE,
    PACKET_RECEIVE_ANNOUNCE,
    PACKET_EVENT,
    PACKET_REPORT,
    PACKET_PROCESS,
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
    REPORT_UPDATE,
    REGISTER_POLL_REPORT_INTERVAL,
    REGISTER_POLL_REPORT_MAX_INTERVAL,
    REGISTER_OPTIONAL_POLL_COUNT,
    PACKET_PRE_PROCESS,
    STREAMING_DEFAULT_INTERVAL,
    REGISTER_POLL_FIRST_REPORT_INTERVAL,
    SERVICE_PROVIDER_ADDED,
    SERVICE_PROVIDER_REMOVED,
    REFRESH,
    ROLE_MANAGER_CHANGE,
    TIMEOUT_DISCONNECT,
    REGISTER_POLL_STREAMING_INTERVAL,
    REPORT_RECEIVE,
    CMD_SET_REG,
    PING_LOGGERS_POLL,
    RESET_IN_TIME_US,
    REFRESH_REGISTER_POLL,
    META_TRACE,
    DEVICE_CLEAN,
    REGISTER_POLL_REPORT_VOLATILE_MAX_INTERVAL,
    REGISTER_POLL_REPORT_VOLATILE_INTERVAL,
} from "./constants"
import { serviceClass } from "./pretty"
import JDNode from "./node"
import {
    FirmwareBlob,
    scanFirmwares,
    sendStayInBootloaderCommand,
} from "./flashing"
import JDService from "./service"
import { isConstRegister, isReading, isSensor } from "./spec"
import {
    LoggerPriority,
    LoggerReg,
    SensorReg,
    SRV_LOGGER,
    SRV_REAL_TIME_CLOCK,
    SystemReg,
} from "../../src/jdom/constants"
import JDServiceProvider from "./servers/serviceprovider"
import RealTimeClockServer from "../servers/realtimeclockserver"
import { SRV_ROLE_MANAGER } from "../../src/jdom/constants"
import Transport from "./transport/transport"
import { BusStatsMonitor } from "./busstats"
import RoleManagerClient from "./clients/rolemanagerclient"
import JDBridge from "./bridge"
import { randomDeviceId } from "./random"
import { ControlReg, SRV_CONTROL } from "../../jacdac-spec/dist/specconstants"
import Scheduler, { WallClockScheduler } from "./scheduler"
import ServiceFilter from "./filters/servicefilter"
import DeviceFilter from "./filters/devicefilter"
import Flags from "./flags"
import { stack } from "./trace/trace"

/**
 * Creation options for a bus
 * @category JDOM
 */
export interface BusOptions {
    /**
     * The self-device device id
     */
    deviceId?: string
    /**
     * A custom scheduler to control time
     */
    scheduler?: Scheduler
    /**
     * Parent domain origin to handle iframe messages
     */
    parentOrigin?: string
}

const SCAN_FIRMWARE_INTERVAL = 30000

/**
 * A Jacdac bus manager. This instance maintains the list of devices on the bus.
 * @category JDOM
 */
export class JDBus extends JDNode {
    /**
     * @internal
     */
    readonly selfDeviceId: string
    /**
     * A timer and interval schedular to orchastrate bus timestamps
     * @category Scheduling
     */
    readonly scheduler: Scheduler
    /**
     * @internal
     */
    readonly parentOrigin: string
    private readonly _transports: Transport[] = []
    private _bridges: JDBridge[] = []
    private _devices: JDDevice[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _gcInterval: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _announceInterval: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _safeBootInterval: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _refreshRegistersInterval: any
    private _lastPingLoggerTime = 0
    private _lastResetInTime = 0
    private _restartCounter = 0
    private _roleManagerClient: RoleManagerClient
    private _minLoggerPriority = LoggerPriority.Debug
    private _firmwareBlobs: FirmwareBlob[]
    private _gcDevicesFrozen = 0
    private _serviceProviders: JDServiceProvider[] = []

    /**
     * Gets an instance that tracks packet statistics
     * @category Diagnostics
     **/
    public readonly stats: BusStatsMonitor

    /**
     * Creates the bus with the given transport
     * @param sendPacket
     * @category Lifecycle
     */
    constructor(transports?: Transport[], options?: BusOptions) {
        super()

        this.selfDeviceId = options?.deviceId || randomDeviceId()
        this.scheduler = options?.scheduler || new WallClockScheduler()
        this.parentOrigin = options?.parentOrigin || "*"
        this.stats = new BusStatsMonitor(this)

        // some transport may be undefined
        transports?.filter(tr => !!tr).map(tr => this.addTransport(tr))

        // tell loggers to send data, every now and then
        // send resetin packets
        this.on(SELF_ANNOUNCE, this.handleSelfAnnounce.bind(this))
        // tell RTC clock the computer time
        this.on(DEVICE_ANNOUNCE, this.handleRealTimeClockSync.bind(this))
        // grab the default role manager
        this.on(DEVICE_CHANGE, this.handleRoleManager.bind(this))

        // start all timers
        this.start()
    }

    /**
     * Gets the list of transports registers with the bus
     * @category Transports and Bridges
     */
    get transports() {
        return this._transports.slice(0)
    }

    /**
     * Adds a transport to the bus
     * @category Transports and Bridges
     */
    addTransport(transport: Transport) {
        if (this._transports.indexOf(transport) > -1) return // already added

        this._transports.push(transport)
        transport.bus = this
        transport.bus.on(CONNECTING, () => this.preConnect(transport))
    }

    /**
     * Gets the list of bridges registered with the bus
     * @category Transports and Bridges
     */
    get bridges() {
        return this._bridges.slice(0)
    }

    /**
     * Add a bridge to the bus and returns a callback to remove it.
     * @param bridge
     * @returns callback to remove bridge
     * @category Transports and Bridges
     */
    addBridge(bridge: JDBridge): () => void {
        if (this._bridges.indexOf(bridge) < 0) {
            console.debug(`add bridge`, { bridge })
            this._bridges.push(bridge)
            this.emit(CHANGE)
        }
        return () => this.removeBridge(bridge)
    }

    private removeBridge(bridge: JDBridge) {
        const i = this._bridges.indexOf(bridge)
        if (i > -1) {
            console.debug(`remove bridge`, { bridge })
            this._bridges.splice(i, 1)
            this.emit(CHANGE)
        }
    }

    private preConnect(transport: Transport) {
        console.debug(`preconnect ${transport.type}`, { transport })
        return Promise.all(
            this._transports
                .filter(t => t !== transport)
                .map(t => t.disconnect())
        )
    }

    /**
     * Connects the bus going through the transports chronologically. Does nothing if already connected.
     * @param background connection was triggered automatically
     * @category Lifecycle
     */
    async connect(background?: boolean) {
        if (this.connected) return

        for (const transport of this._transports) {
            // start connection
            await transport.connect(background)
            // keep going if not connected
            if (transport.connected) break
        }
        this.emit(CHANGE)
    }

    /**
     * Disconnects the bus and any connected transport.
     * @category Lifecycle
     */
    async disconnect() {
        for (const transport of this._transports) {
            await transport.disconnect()
        }
        this.emit(CHANGE)
    }

    /**
     * Starts to process packets and updates the JDOM nodes
     * @category Lifecycle
     */
    start() {
        if (!this._announceInterval)
            this._announceInterval = this.scheduler.setInterval(
                () => this.emit(SELF_ANNOUNCE),
                499
            )
        this.backgroundRefreshRegisters = true
        if (!this._gcInterval)
            this._gcInterval = this.scheduler.setInterval(
                () => this.gcDevices(),
                JD_DEVICE_DISCONNECTED_DELAY
            )
    }

    /**
     * Stops processing packets
     * @category Lifecycle
     */
    async stop() {
        await this.disconnect()
        if (this._announceInterval) {
            this.scheduler.clearInterval(this._announceInterval)
            this._announceInterval = undefined
        }
        this.safeBoot = false
        this.backgroundRefreshRegisters = false
        if (this._gcInterval) {
            this.scheduler.clearInterval(this._gcInterval)
            this._gcInterval = undefined
        }
    }

    /**
     * Stops the bus and all transport connections.
     * @category Lifecycle
     */
    async dispose() {
        console.debug(`${this.id}: disposing.`)
        await this.stop()
        this._transports.forEach(transport => transport.dispose())
    }

    /**
     * Indicates that the bus is sending commands keep devices in bootloader mode.
     * This property is signaled by CHANGE.
     * @category Lifecycle
     */
    get safeBoot() {
        return !!this._safeBootInterval
    }

    /**
     * Turn on or off the safe boot mode where the bus keeps devices in bootloader mode.
     * Triggers a CHANGE event.
     * @category Lifecycle
     */
    set safeBoot(enabled: boolean) {
        if (enabled && !this._safeBootInterval) {
            this._safeBootInterval = this.scheduler.setInterval(() => {
                // don't send message if any device is flashing
                if (this._devices.some(d => d.flashing)) return
                sendStayInBootloaderCommand(this)
            }, 50)
            this.emit(CHANGE)
        } else if (!enabled && this._safeBootInterval) {
            this.scheduler.clearInterval(this._safeBootInterval)
            this._safeBootInterval = undefined
            this.emit(CHANGE)
        }
    }

    /**
     * Indicates if any of the transports is connected.
     * Some transports might be in the process of connecting or disconnecting.
     * @category Lifecycle
     */
    get connected() {
        return this._transports.some(t => t.connected)
    }

    /**
     * Indicates if any of the transports is disconnected.
     * Some transports might be in the process of connecting or disconnecting.
     * @category Lifecycle
     */
    get disconnected() {
        return this._transports.every(t => t.disconnected)
    }

    /**
     * Clears known devices and service providers (simulators). Optionally reset bus timestamp.
     * @param timestamp
     * @category Services
     */
    clear(timestamp = 0) {
        // clear hosts
        if (this._serviceProviders?.length) {
            this._serviceProviders.forEach(host => (host.bus = undefined))
            this._serviceProviders = []
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
        this.resetTime(timestamp)
    }

    /**
     * Gets a unique identifier for this node in the Jacdac DOM.
     * @category JDOM
     */
    get id(): string {
        return this.nodeKind
    }

    /**
     * Gets the bus name
     * @category JDOM
     */
    get name(): string {
        return "bus"
    }

    /**
     * Gets the bus name
     * @category JDOM
     */
    get friendlyName(): string {
        return this.name
    }

    /**
     * Gets the bus name
     * @category JDOM
     */
    get qualifiedName(): string {
        return this.name
    }

    /**
     * Returns the ``BUS_NODE_NAME``
     * @category JDOM
     */
    get nodeKind(): string {
        return BUS_NODE_NAME
    }

    /**
     * Gets the default role manager service client, if any
     * @category Services
     */
    get roleManager(): RoleManagerClient {
        return this._roleManagerClient
    }

    /**
     * Sets the default role manager service client
     * @category Services
     */
    setRoleManagerService(service: JDService) {
        //console.log(`set role manager`, { service })
        // clean if needed
        if (
            this._roleManagerClient &&
            this._roleManagerClient.service !== service
        ) {
            //console.debug("unmount role manager")
            this._roleManagerClient.unmount()
            this._roleManagerClient = undefined
        }

        // allocate new manager
        if (service && service !== this._roleManagerClient?.service) {
            //console.debug("mount role manager")
            this._roleManagerClient = new RoleManagerClient(service)
            this.emit(ROLE_MANAGER_CHANGE)
            this.emit(CHANGE)
            this._roleManagerClient.startRefreshRoles()
        }
    }

    /**
     * @internal
     */
    toString(): string {
        return `bus: ${this._devices?.length || 0} devices, ${
            this._transports
                ?.filter(tr => tr.connected)
                .map(tr => tr.type)
                .join(", ") || ""
        }`
    }

    /**
     * Resolves a JDOM node from an identifier
     * @param id node identifier
     * @returns node if found, undefined otherwise
     * @category JDOM
     */
    node(id: string): JDNode {
        const resolve = (): JDNode => {
            const m =
                /^(?<type>bus|device|service|register|event|field)(:(?<dev>\w+)(:(?<srv>\w+)(:(?<reg>\w+(:(?<idx>\w+))?))?)?)?$/.exec(
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
                    return this.device(dev, true)
                case SERVICE_NODE_NAME:
                    return this.device(dev, true)?.service(srv)
                case REGISTER_NODE_NAME:
                    return this.device(dev, true)?.service(srv)?.register(reg)
                case EVENT_NODE_NAME:
                    return this.device(dev, true)?.service(srv)?.event(reg)
                case FIELD_NODE_NAME:
                    return this.device(dev, true)?.service(srv)?.register(reg)
                        ?.fields[idx]
            }
            console.info(`node ${id} not found`)
            return undefined
        }
        const node = resolve()
        return node
    }

    private resetTime(delta = 0) {
        this.scheduler.resetTime(delta)
        this.emit(CHANGE)
    }

    /**
     * Gets the current bus-relavite time in milliseconds
     * @category Scheduling
     */
    get timestamp(): number {
        return this.scheduler.timestamp
    }

    /**
     * Creates a promise that awaits for the given duration using the bus scheduler
     * @category Scheduling
     */
    delay<T>(millis: number, value?: T): Promise<T | undefined> {
        return new Promise(resolve =>
            this.scheduler.setTimeout(() => resolve(value), millis)
        )
    }

    /**
     * Gets the current desired minimum logger verbosity on the bus
     * @category Diagnostics
     */
    get minLoggerPriority(): LoggerPriority {
        return this._minLoggerPriority
    }

    /**
     * Sets the current desired minimum logger verbosity on the bus
     * @category Diagnostics
     */
    set minLoggerPriority(priority: LoggerPriority) {
        if (priority !== this._minLoggerPriority) {
            this._minLoggerPriority = priority
            this.emit(CHANGE)
        }
    }

    /**
     * Returns undefined
     * @category JDOM
     */
    get parent(): JDNode {
        return undefined
    }

    private async handleRealTimeClockSync(device: JDDevice) {
        // tell time to the RTC clocks
        if (device.hasService(SRV_REAL_TIME_CLOCK))
            await RealTimeClockServer.syncTime(this)
    }

    private handleRoleManager() {
        if (this.roleManager) return

        const service = this.services({ serviceClass: SRV_ROLE_MANAGER })[0]
        this.setRoleManagerService(service)
    }

    /**
     * Sends a packet to the bus
     * @param packet packet to send
     * @internal
     */
    async sendPacketAsync(packet: Packet) {
        packet.timestamp = this.timestamp
        if (Flags.trace) packet.meta[META_TRACE] = stack()
        this.emit(PACKET_SEND, packet)

        await Promise.all(
            this._transports.map(transport => transport.sendPacketAsync(packet))
        )
    }

    /**
     * Gets the list of known firmware blobs
     * @category Firmware
     */
    get firmwareBlobs() {
        return this._firmwareBlobs
    }

    /**
     * Sets the list of known firmware blobs
     * @category Firmware
     */
    set firmwareBlobs(blobs: FirmwareBlob[]) {
        this._firmwareBlobs = blobs
        this.emit(FIRMWARE_BLOBS_CHANGE)
        this.emit(CHANGE)
    }

    /**
     * Gets the current list of known devices on the bus
     * @category Services
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
            r = r.filter(r => !this.findServiceProvider(r.deviceId))
        if (options?.productIdentifier) r = r.filter(r => !!r.productIdentifier)
        if (options?.physical) r = r.filter(r => !!r.isPhysical)
        return r
    }

    /**
     * Gets the current list of service providers on the bus
     * @category Services
     */
    serviceProviders(): JDServiceProvider[] {
        return this._serviceProviders.slice(0)
    }

    /**
     * Get a service providers for a given device
     * @param deviceId
     * @category Services
     */
    findServiceProvider(deviceId: string) {
        return this._serviceProviders.find(d => d.deviceId === deviceId)
    }

    /**
     * Adds the service provider to the bus and returns the associated devoce
     * @param provider instance to add
     * @category Services
     */
    addServiceProvider(provider: JDServiceProvider) {
        if (provider && this._serviceProviders.indexOf(provider) < 0) {
            this._serviceProviders.push(provider)
            provider.bus = this

            this.emit(SERVICE_PROVIDER_ADDED, provider)
            this.emit(CHANGE)
        }

        return this.device(provider.deviceId)
    }

    /**
     * Removes the service provider from the bus
     * @param provider instance to remove
     * @category Services
     */
    removeServiceProvider(provider: JDServiceProvider) {
        if (!provider) return

        const i = this._serviceProviders.indexOf(provider)
        if (i > -1) {
            // remove device as well
            const devi = this._devices.findIndex(
                d => d.deviceId === provider.deviceId
            )
            if (devi > -1) {
                const dev = this._devices[devi]
                this._devices.splice(devi, 1)
                dev.disconnect()
                this.emit(DEVICE_DISCONNECT, dev)
                this.emit(DEVICE_CHANGE, dev)
            }

            // remove host
            this._serviceProviders.splice(i, 1)
            provider.bus = undefined
            this.emit(SERVICE_PROVIDER_REMOVED, provider)

            // removed host
            this.emit(CHANGE)
        }
    }

    /**
     * Gets the list of devices
     * @category JDOM
     */
    get children(): JDNode[] {
        return this.devices()
    }

    /**
     * Gets the current list of services from all the known devices on the bus
     * @category Services
     */
    services(options?: ServiceFilter & DeviceFilter): JDService[] {
        return arrayConcatMany(
            this.devices(options).map(d => d.services(options))
        )
    }

    /**
     * Gets a device on the bus
     * @param id device identifier to query
     * @param skipCreate do not create new device if missing
     * @param pkt packet that generated this device query
     * @category Services
     */
    device(id: string, skipCreate?: boolean, pkt?: Packet) {
        if (id === "0000000000000000" && !skipCreate) {
            console.warn("jadac: trying to access device 0000000000000000")
            return undefined
        }
        let d = this._devices.find(d => d.deviceId == id)
        if (!d && !skipCreate) {
            if (this.devicesFrozen) {
                console.debug(`info`, `devices frozen, dropping ${id}`)
                return undefined
            }
            d = new JDDevice(this, id, pkt)
            this._devices.push(d)
            console.debug(
                `${id === this.selfDeviceId ? "self" : "new"} device ${
                    d.shortId
                } (${id})`
            )
            // stable sort
            this._devices.sort((l, r) => strcmp(l.deviceId, r.deviceId))
            this.emit(DEVICE_CONNECT, d)
            this.emit(DEVICE_CHANGE, d)
            this.emit(CHANGE)
        }
        return d
    }

    private _debouncedScanFirmwares: () => void
    /**
     * Enables or disables automatically scanning and resolving firmware updates
     * @param enabled true to scan firmware in the background
     * @category Firmware
     */
    setBackgroundFirmwareScans(enabled: boolean) {
        const isSSR = typeof window === "undefined"
        if (isSSR) enabled = false

        if (enabled) {
            if (!this._debouncedScanFirmwares) {
                this._debouncedScanFirmwares = debounceAsync(async () => {
                    if (this._transports.some(tr => tr.connected)) {
                        console.info(`scanning firmwares`)
                        await scanFirmwares(this)
                    }
                }, SCAN_FIRMWARE_INTERVAL)
                this.on(DEVICE_ANNOUNCE, this._debouncedScanFirmwares)
            }
        } else {
            if (this._debouncedScanFirmwares) {
                console.debug(`disabling background firmware scans`)
                const d = this._debouncedScanFirmwares
                this._debouncedScanFirmwares = undefined
                this.off(DEVICE_ANNOUNCE, d)
            }
        }
    }

    /**
     * Push a context to disable cleaning device that haven't issued packets recently.
     * @category Lifecycle
     */
    pushDeviceFrozen() {
        this._gcDevicesFrozen++
    }

    /**
     * Pop a context to disable cleaning device that haven't issued packets recently.
     * @category Lifecycle
     */
    popDeviceFrozen() {
        this._gcDevicesFrozen = Math.max(0, this._gcDevicesFrozen - 1)
    }

    /**
     * Indicates if the device list if currently frozen.
     * @category Lifecycle
     */
    get devicesFrozen() {
        return this._gcDevicesFrozen > 0
    }

    private gcDevices() {
        this.emit(DEVICE_CLEAN)
        if (this.devicesFrozen) {
            console.debug("devices frozen")
            return
        }

        const LOST_DELAY = JD_DEVICE_LOST_DELAY
        const DISCONNECTED_DELAY = JD_DEVICE_DISCONNECTED_DELAY
        const lostCutoff = this.timestamp - LOST_DELAY
        const disconnectedCutoff = this.timestamp - DISCONNECTED_DELAY

        // cycle through events and disconnect devices that are long gone
        for (let i = 0; i < this._devices.length; ++i) {
            const dev = this._devices[i]

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
     * @internal
     */
    processPacket(pkt: Packet) {
        if (!pkt.isMultiCommand && !pkt.device) {
            pkt.device = this.device(pkt.deviceIdentifier, false, pkt)
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
                } else if (
                    pkt.isMultiCommand &&
                    pkt.serviceCommand == (CMD_SET_REG | ControlReg.ResetIn)
                ) {
                    // someone else is doing reset in
                    this._lastResetInTime = this.timestamp
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

    /**
     * Gets the virtual device created by this bus to handle pipes.
     * @category Services
     */
    get selfDevice() {
        return this.device(this.selfDeviceId)
    }

    private handleSelfAnnounce(): Promise<void> {
        return Promise.all([
            this.sendAnnounce(),
            this.sendResetIn(),
            this.pingLoggers(),
        ]).then(() => {})
    }

    private async sendAnnounce() {
        // we do not support any services (at least yet)
        if (this._restartCounter < 0xf) this._restartCounter++
        const pkt = Packet.jdpacked<[number]>(CMD_ADVERTISEMENT_DATA, "u32", [
            this._restartCounter | 0x100,
        ])
        pkt.serviceIndex = JD_SERVICE_INDEX_CTRL
        pkt.deviceIdentifier = this.selfDeviceId
        await pkt.sendReportAsync(this.selfDevice)
    }

    private async sendResetIn() {
        // don't send reset if already received
        // or no devices
        if (
            this._lastResetInTime - this.timestamp > RESET_IN_TIME_US / 3 ||
            !this.devices({ ignoreSelf: true }).length
        )
            return

        this._lastResetInTime = this.timestamp
        const rst = Packet.jdpacked<[number]>(
            CMD_SET_REG | ControlReg.ResetIn,
            "u32",
            [RESET_IN_TIME_US]
        )
        await rst.sendAsMultiCommandAsync(this, SRV_CONTROL)
    }

    private async pingLoggers() {
        if (
            this._minLoggerPriority < LoggerPriority.Silent &&
            this.timestamp - this._lastPingLoggerTime > PING_LOGGERS_POLL &&
            this.devices({ ignoreSelf: true, serviceClass: SRV_LOGGER })
                .length > 0
        ) {
            this._lastPingLoggerTime = this.timestamp
            const pkt = Packet.jdpacked<[LoggerPriority]>(
                CMD_SET_REG | LoggerReg.MinPriority,
                "u8",
                [this._minLoggerPriority]
            )
            await pkt.sendAsMultiCommandAsync(this, SRV_LOGGER)
        }
    }

    /**
     * Indicates if registers are automatically refreshed in the background.
     * @category Services
     */
    get backgroundRefreshRegisters() {
        return !!this._refreshRegistersInterval
    }

    /**
     * Enables or disables automatically refreshing registers in the background.
     * @param enabled true to automatically refresh registers
     * @category Services
     */
    set backgroundRefreshRegisters(enabled: boolean) {
        if (!!enabled !== this.backgroundRefreshRegisters) {
            if (!enabled) {
                if (this._refreshRegistersInterval)
                    this.scheduler.clearInterval(this._refreshRegistersInterval)
                this._refreshRegistersInterval = undefined
            } else {
                this._refreshRegistersInterval = this.scheduler.setInterval(
                    this.handleRefreshRegisters.bind(this),
                    REFRESH_REGISTER_POLL
                )
            }
        }
    }

    /**
     * Cycles through all known registers and refreshes the once that have REPORT_UPDATE registered
     */
    private handleRefreshRegisters() {
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
                            .filter(
                                reg =>
                                    reg.listenerCount(REPORT_RECEIVE) > 0 ||
                                    reg.listenerCount(REPORT_UPDATE) > 0
                            )
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
                    // if no interval, poll interval value
                    if (
                        interval === undefined &&
                        intervalRegister &&
                        intervalRegister.lastGetTimestamp - this.timestamp >
                            REGISTER_POLL_STREAMING_INTERVAL
                    ) {
                        // all async
                        if (!intervalRegister.data)
                            intervalRegister.sendGetAsync()
                        if (!preferredInterval.data)
                            preferredInterval.sendGetAsync()
                    }
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
                    const samplesAge =
                        this.timestamp - samplesRegister.lastSetTimestamp
                    // need to figure out when we asked for streaming
                    const midSamplesAge = (interval * 0xff) / 2
                    // compute if half aged
                    if (samplesAge > midSamplesAge) {
                        //console.debug({ samplesAge, midSamplesAge, interval })
                        samplesRegister.sendSetPackedAsync([0xff])
                    }
                }

                // first query, get data asap once per second
                if (noDataYet && age > 1000) register.sendGetAsync()
            } // regular register, ping if data is old
            else {
                const volatile = !!specification?.volatile
                const expiration = volatile
                    ? Math.min(
                          REGISTER_POLL_REPORT_VOLATILE_MAX_INTERVAL,
                          REGISTER_POLL_REPORT_VOLATILE_INTERVAL *
                              (1 << backoff)
                      )
                    : Math.min(
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

        // apply streaming samples to service provider
        this._serviceProviders.map(host => host.emit(REFRESH))
    }

    /**
     * Runs a promise with a timeout. Returns undefined if timeout happens before of disconnection.
     * @param timeout duration to wait before declaring timeout
     * @param promise promise to wrap
     * @category Lifecycle
     */
    withTimeout<T>(timeout: number, promise: Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            let done = false
            const tid = setTimeout(() => {
                if (!done) {
                    done = true
                    if (!this._transports.some(tr => tr.connected)) {
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
            promise.then(
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

export default JDBus

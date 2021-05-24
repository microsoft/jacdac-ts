import Packet from "./packet"
import { JDDevice } from "./device"
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
} from "./constants"
import { serviceClass } from "./pretty"
import { JDNode } from "./node"
import {
    FirmwareBlob,
    scanFirmwares,
    sendStayInBootloaderCommand,
} from "./flashing"
import { JDService } from "./service"
import { isConstRegister, isReading, isSensor } from "./spec"
import {
    LoggerPriority,
    LoggerReg,
    SensorReg,
    SRV_LOGGER,
    SRV_REAL_TIME_CLOCK,
    SystemReg,
} from "../../src/jdom/constants"
import JDServiceProvider from "./serviceprovider"
import RealTimeClockServer from "../servers/realtimeclockserver"
import { SRV_ROLE_MANAGER } from "../../src/jdom/constants"
import { JDTransport } from "./transport/transport"
import { BusStatsMonitor } from "./busstats"
import { RoleManagerClient } from "./rolemanagerclient"
import JDBridge from "./bridge"
import IFrameBridgeClient from "./iframebridgeclient"
import { randomDeviceId } from "./random"
import { ControlReg } from "../../jacdac-spec/dist/specconstants"
export interface BusOptions {
    deviceLostDelay?: number
    deviceDisconnectedDelay?: number
    deviceId?: string

    parentOrigin?: string
}

export interface Error {
    context: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exception: any
}

const SCAN_FIRMWARE_INTERVAL = 30000

export interface DeviceFilter {
    serviceName?: string
    serviceClass?: number
    ignoreSelf?: boolean
    announced?: boolean
    ignoreSimulators?: boolean
    firmwareIdentifier?: boolean
    physical?: boolean
}

export interface ServiceFilter {
    serviceIndex?: number
    serviceName?: string
    serviceClass?: number
    specification?: boolean
    mixins?: boolean
}

/**
 * A Jacdac bus manager. This instance maintains the list of devices on the bus.
 */
export class JDBus extends JDNode {
    private readonly _transports: JDTransport[] = []
    private _bridges: JDBridge[] = []
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
    private _lastPingLoggerTime = 0
    private _lastResetInTime = 0
    private _restartCounter = 0
    private _roleManagerClient: RoleManagerClient
    private _minLoggerPriority = LoggerPriority.Debug
    private _firmwareBlobs: FirmwareBlob[]
    private _gcDevicesEnabled = 0
    private _serviceProviders: JDServiceProvider[] = []

    public readonly stats: BusStatsMonitor
    public iframeBridge: IFrameBridgeClient

    /**
     * Creates the bus with the given transport
     * @param sendPacket
     */
    constructor(transports?: JDTransport[], public options?: BusOptions) {
        super()

        transports?.filter(tr => !!tr).map(tr => this.addTransport(tr))

        this.options = this.options || {}
        if (!this.options.deviceId) this.options.deviceId = randomDeviceId()

        this.stats = new BusStatsMonitor(this)
        this.resetTime()

        // tell loggers to send data, every now and then
        // send resetin packets
        this.on(SELF_ANNOUNCE, this.sendAnnounce.bind(this))
        this.on(SELF_ANNOUNCE, this.sendResetIn.bind(this))
        this.on(SELF_ANNOUNCE, this.pingLoggers.bind(this))
        // tell RTC clock the computer time
        this.on(DEVICE_ANNOUNCE, this.handleRealTimeClockSync.bind(this))
        // grab the default role manager
        this.on(DEVICE_CHANGE, this.handleRoleManager.bind(this))

        // start all timers
        this.start()
    }

    get transports() {
        return this._transports.slice(0)
    }

    addTransport(transport: JDTransport) {
        if (this._transports.indexOf(transport) > -1) return // already added

        this._transports.push(transport)
        transport.bus = this
        transport.bus.on(CONNECTING, () => this.preConnect(transport))
    }

    get bridges() {
        return this._bridges.slice(0)
    }

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

    private preConnect(transport: JDTransport) {
        console.debug(`preconnect ${transport.type}`, { transport })
        return Promise.all(
            this._transports
                .filter(t => t !== transport)
                .map(t => t.disconnect())
        )
    }

    async connect(background?: boolean) {
        if (this.connected) return

        for (const transport of this._transports) {
            // start connection
            await transport.connect(background)
            // keep going if not connected
            if (transport.connected) break
        }
    }

    async disconnect() {
        for (const transport of this._transports) {
            await transport.disconnect()
        }
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

    async stop() {
        await this.disconnect()
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

    async dispose() {
        console.debug(`${this.id}: disposing.`)
        await this.stop()
        this._transports.forEach(transport => transport.dispose())
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

    get connected() {
        return this._transports.some(t => t.connected)
    }

    get disconnected() {
        return this._transports.every(t => t.disconnected)
    }

    clear() {
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

    get roleManager(): RoleManagerClient {
        return this._roleManagerClient
    }

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

    toString(): string {
        return this.id
    }

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

    async sendPacketAsync(p: Packet) {
        p.timestamp = this.timestamp
        this.emit(PACKET_SEND, p)

        await Promise.all(
            this._transports.map(transport => transport.sendPacketAsync(p))
        )
    }

    get firmwareBlobs() {
        return this._firmwareBlobs
    }

    set firmwareBlobs(blobs: FirmwareBlob[]) {
        this._firmwareBlobs = blobs
        this.emit(FIRMWARE_BLOBS_CHANGE)
        this.emit(CHANGE)
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
            r = r.filter(r => !this.findServiceProvider(r.deviceId))
        if (options?.firmwareIdentifier)
            r = r.filter(r => !!r.firmwareIdentifier)
        if (options?.physical) r = r.filter(r => !!r.physical)
        return r
    }

    /**
     * Gets the current list of service providers on the bus
     */
    serviceProviders(): JDServiceProvider[] {
        return this._serviceProviders.slice(0)
    }

    /**
     * Get a service providers for a given device
     * @param deviceId
     */
    findServiceProvider(deviceId: string) {
        return this._serviceProviders.find(d => d.deviceId === deviceId)
    }

    /**
     * Adds the service provider to the bus
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
     * @param provider
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

    get children(): JDNode[] {
        return this.devices()
    }

    /**
     * Gets the current list of services from all the known devices on the bus
     */
    services(options?: ServiceFilter & DeviceFilter): JDService[] {
        return arrayConcatMany(
            this.devices(options).map(d => d.services(options))
        )
    }

    /**
     * Gets a device on the bus
     * @param id
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
            console.debug(`new device ${d.shortId} (${id})`)
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
            console.debug("devices frozen")
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
                    pkt.serviceCommand ==
                    (CMD_SET_REG | ControlReg.ResetIn)
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

    get selfDeviceId() {
        return this.options.deviceId
    }

    get selfDevice() {
        return this.device(this.selfDeviceId)
    }

    private sendAnnounce() {
        // we do not support any services (at least yet)
        if (this._restartCounter < 0xf) this._restartCounter++
        const pkt = Packet.jdpacked<[number]>(CMD_ADVERTISEMENT_DATA, "u32", [
            this._restartCounter | 0x100,
        ])
        pkt.serviceIndex = JD_SERVICE_INDEX_CTRL
        pkt.deviceIdentifier = this.selfDeviceId
        pkt.sendReportAsync(this.selfDevice)
    }

    private sendResetIn() {
        if (this._lastResetInTime - this.timestamp > RESET_IN_TIME_US / 3) return

        this._lastResetInTime = this.timestamp
        const rst = Packet.jdpacked<[number]>(
            CMD_SET_REG | ControlReg.ResetIn,
            "u32",
            [RESET_IN_TIME_US]
        )
        rst.serviceIndex = JD_SERVICE_INDEX_CTRL
        rst.deviceIdentifier = this.selfDeviceId
        rst.sendCmdAsync(this.selfDevice)
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

        // apply streaming samples to service provider
        this._serviceProviders.map(host => host.emit(REFRESH))
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

import { JDFrameBuffer, Packet, isLargeFrame } from "./packet"
import { JDDevice } from "./device"
import { arrayConcatMany, strcmp, toHex, uint8ArrayToString } from "./utils"
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
    SRV_INFRASTRUCTURE,
    CONNECTION_STATE,
    PACKET_RECEIVE_NO_DEVICE,
    FRAME_PROCESS,
    FRAME_SEND,
    DISPOSE,
    FRAME_PROCESS_LARGE,
} from "./constants"
import { serviceClass } from "./pretty"
import { JDNode } from "./node"
import { FirmwareBlob, sendStayInBootloaderCommand } from "./flashing"
import { JDService } from "./service"
import {
    isConstRegister,
    isReading,
    isSensor,
    loadServiceSpecifications,
    serviceSpecifications,
} from "./spec"
import {
    LoggerPriority,
    LoggerReg,
    SensorReg,
    SRV_LOGGER,
    SRV_REAL_TIME_CLOCK,
    SystemReg,
} from "../../src/jdom/constants"
import { JDServiceProvider } from "./servers/serviceprovider"
import { RealTimeClockServer } from "../servers/realtimeclockserver"
import { SRV_ROLE_MANAGER } from "../../src/jdom/constants"
import { Transport, ConnectionState } from "./transport/transport"
import { BusStatsMonitor } from "./busstats"
import { RoleManagerClient } from "./clients/rolemanagerclient"
import { JDBridge } from "./bridge"
import { randomDeviceId } from "./random"
import {
    ControlAnnounceFlags,
    ControlReg,
    SRV_CONTROL,
    SRV_DASHBOARD,
    SRV_PROXY,
} from "../../jacdac-spec/dist/specconstants"
import { Scheduler, WallClockScheduler } from "./scheduler"
import { ServiceFilter } from "./filters/servicefilter"
import { DeviceFilter } from "./filters/devicefilter"
import { Flags } from "./flags"
import { stack } from "./trace/trace"
import { DeviceCatalog } from "./catalog"
import { jdunpack } from "./pack"

export type BusBroadcastMessageType =
    | "visibilitychange"
    | "disconnect"
    | "connectionstate"

export interface BusBroadcastMessage {
    id: string
    event: BusBroadcastMessageType
}

export interface BusBroadcastVisibilityChangeMessage
    extends BusBroadcastMessage {
    event: "visibilitychange"
    visibilityState?: "hidden" | "visible"
    transports: { type: string; connectionState: string }[]
}

export interface BusBroadcastConnectionStateMessage
    extends BusBroadcastMessage {
    event: "connectionstate"
    transports: { type: string; connectionState: string }[]
}

export const enum BusInteractionMode {
    /**
     * The bus mounts a self device and actively interacts with devices, including polling registers
     * automatically
     */
    Active,
    /**
     * The bus mounts a self device and does not poll registers automatically
     */
    Observer,
    /**
     * The bus does not emit any package
     */
    Passive,
}

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
     * Parent domain origin to handle iframe messages. Defaults to "*".
     */
    parentOrigin?: string
    /**
     * enable bus acting as a client
     */
    client?: boolean
    /**
     * Ignore role managers detected on the bus
     */
    disableRoleManager?: boolean
    /**
     * This bus is a dashboard
     */
    dashboard?: boolean
    /**
     * This bus is a proxy
     */
    proxy?: boolean
    /**
     * Stable identifier used to generate unique simulator identifier accross multiple hosted bus environment
     */
    serviceProviderIdSalt?: string
    /**
     * Broadcast reset packet
     */
    resetIn?: boolean

    /**
     * Additional serial connection vendor ids
     */
    serialVendorIds?: number[]

    /**
     * Custom services
     */
    services?: jdspec.ServiceSpec[]
}

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
     * A timer and interval schedular to orchestrate bus timestamps
     * @category Scheduling
     */
    readonly scheduler: Scheduler
    /**
     * @internal
     */
    readonly parentOrigin: string
    /**
     * @internal
     */
    readonly serviceProviderIdSalt: string
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
    // null means disabled
    private _roleManager: RoleManagerClient
    private _minLoggerPriority = LoggerPriority.Silent
    private _firmwareBlobs: FirmwareBlob[]
    private _gcDevicesFrozen = 0
    private _serviceProviders: JDServiceProvider[] = []
    private _unsubscribeBroadcastChannel: () => void
    private _postBroadcastMessage: (
        event: BusBroadcastMessageType,
        msg: Partial<BusBroadcastMessage>,
    ) => void
    private _streaming = false
    private _interactionMode = BusInteractionMode.Active
    private _autoConnect = false
    private _resetIn = false
    // self device is a client
    private _client = false
    // self device is a dashboard
    private _dashboard = false
    // acts as a proxy
    private _proxy = false

    /**
     * the device catalog
     * @category JDOM
     */
    public readonly deviceCatalog: DeviceCatalog

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
    constructor(transports?: (Transport | undefined)[], options?: BusOptions) {
        super()

        const {
            deviceId,
            scheduler,
            parentOrigin,
            client,
            disableRoleManager,
            dashboard,
            proxy,
            serviceProviderIdSalt,
            resetIn,
            serialVendorIds,
            services,
        } = options || {}

        this._roleManager = undefined
        this.selfDeviceId = deviceId || randomDeviceId()
        this.scheduler = scheduler || new WallClockScheduler()
        this.parentOrigin = parentOrigin || "*"
        this.serviceProviderIdSalt = serviceProviderIdSalt || ""
        this._client = !!client
        this._dashboard = !!dashboard
        this._proxy = !!proxy
        this._resetIn = !!resetIn
        this.stats = new BusStatsMonitor(this)
        this.deviceCatalog = new DeviceCatalog({ serialVendorIds })

        // some transport may be undefined
        transports?.filter(tr => !!tr).map(tr => this.addTransport(tr))
        // tell loggers to send data, every now and then
        // send resetin packets
        this.on(SELF_ANNOUNCE, this.handleSelfAnnounce.bind(this))
        // tell RTC clock the computer time
        this.on(DEVICE_ANNOUNCE, this.handleRealTimeClockSync.bind(this))
        // grab the default role manager
        if (!disableRoleManager)
            this.on(DEVICE_CHANGE, this.handleRoleManager.bind(this))
        // extra services
        if (services?.length) loadServiceSpecifications(services)
        // start all timers
        this.start()
    }

    private configureBroadcastChannel() {
        if (
            typeof BroadcastChannel === "undefined" ||
            typeof self === "undefined" ||
            this._unsubscribeBroadcastChannel
        )
            return

        // the purpose of this code is to orchestrate
        // interactions with multiple tabs and windows
        const channel = new BroadcastChannel("jacdac")
        const postConnectionState = () => {
            channel.postMessage({
                id: this.selfDevice.shortId,
                event: CONNECTION_STATE,
                transports: this._transports.map(tr => ({
                    type: tr.type,
                    connectionState: tr.connectionState,
                })),
            })
        }
        // update other windows with connection status
        const unsubConnectionState = this.subscribe(
            CONNECTION_STATE,
            postConnectionState,
        )
        this._postBroadcastMessage = (
            event: BusBroadcastMessageType,
            msg: Partial<BusBroadcastMessage>,
        ) => {
            const bmsg = {
                id: this.selfDevice.shortId,
                event,
                ...(msg || {}),
            }
            //console.debug(`jacdac broadcast: ${bmsg.event}`, bmsg)
            channel.postMessage(bmsg)
        }
        const handleVisibilityChange = () =>
            this._postBroadcastMessage("visibilitychange", <
                BusBroadcastVisibilityChangeMessage
            >{
                visibilityState: document.visibilityState,
            })
        const handleBroadcastMessage = async (
            msg: MessageEvent<BusBroadcastMessage>,
        ) => {
            const { data } = msg
            const { event } = data
            //console.debug(`jacdac broadcast: received ${event}`)
            switch (event) {
                case "visibilitychange": {
                    // automatically disconnect if another pane becomes live
                    //console.debug(
                    //   `broadcast ${id}: ${event} ${visibilityState}`
                    //)
                    const { visibilityState } =
                        data as BusBroadcastVisibilityChangeMessage
                    if (visibilityState === "visible") await this.disconnect()
                    else if (this.autoConnect) {
                        // let other window disconnect
                        await this.delay(2000)
                        await this.connect(true)
                    }
                    break
                }
                case "disconnect": {
                    await this.disconnect()
                    break
                }
                case "connectionstate": {
                    //console.debug(`broadcast ${id}: ${event}`, transports)
                    // if any other window is trying to connect, disconnect
                    const { transports = [] } =
                        data as BusBroadcastConnectionStateMessage
                    transports
                        .filter(
                            tr =>
                                tr.connectionState ===
                                ConnectionState.Connecting,
                        )
                        .forEach(ctr => {
                            this.transports
                                .filter(tr => tr.type === ctr.type)
                                .forEach(tr => tr.disconnect())
                        })
                }
            }
        }

        channel.addEventListener("message", handleBroadcastMessage, false)
        document.addEventListener("visibilitychange", handleVisibilityChange)
        this._unsubscribeBroadcastChannel = () => {
            unsubConnectionState()
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            )
            channel.removeEventListener("message", handleBroadcastMessage)
            channel.close()
        }

        // notify other pages
        handleVisibilityChange()
    }

    /**
     * Broadcast a request to disconnect to all other javadac buses.
     */
    broadcastDisconnectRequest() {
        this._postBroadcastMessage?.("disconnect", {})
    }

    /**
     * Indicates that this bus acts as a client device
     * @category Lifecycle
     */
    get client() {
        return this._client
    }

    /**
     * Sets the client state
     * @category Lifecycle
     */
    set client(value: boolean) {
        if (!!value !== this._client) {
            this._client = !!value
            this.emit(CHANGE)
        }
    }

    /**
     * Indicates if the bus is a dashboard
     * @category Lifecycle
     */
    get dashboard() {
        return this._dashboard
    }

    /**
     * Gets the list of transports registers with the bus
     * @category Transports and Bridges
     */
    get transports() {
        return this._transports.slice(0)
    }

    /**
     * Adds a transport to the bus. Returns unregistration handler
     * @category Transports and Bridges
     */
    addTransport(transport: Transport | undefined): () => Promise<void> {
        if (!transport || this._transports.indexOf(transport) > -1) return // already added

        this._transports.push(transport)
        transport.setBus(this)
        const pre = () => this.preConnect(transport)
        this.on(CONNECTING, pre)

        const unmount = async () => {
            const i = this._transports.indexOf(transport)
            if (i > -1) {
                this.off(CONNECTING, pre)
                this._transports.splice(i, 1)
                this.emit(CONNECTION_STATE)
                await transport.disconnectBus()
            }
        }

        transport.on(DISPOSE, unmount)

        this.emit(CONNECTION_STATE)

        return unmount
    }

    /**
     * Automatically try to connect to detected devices
     */
    get autoConnect() {
        return this._autoConnect
    }

    /**
     * Sets the auto-connected mode
     */
    set autoConnect(value: boolean) {
        if (value !== this._autoConnect) {
            this._autoConnect = value
            this.emit(CHANGE)

            // auto start
            if (
                this.disconnected &&
                this._autoConnect &&
                typeof document !== "undefined" &&
                document.visibilityState === "visible"
            )
                this.connect(true)
        }
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
     * @internal
     */
    addBridge(bridge: JDBridge): () => void {
        if (this._bridges.indexOf(bridge) < 0) {
            this._bridges.push(bridge)
            bridge.bus = this
            this.emit(CHANGE)
        }
        return () => this.removeBridge(bridge)
    }

    private removeBridge(bridge: JDBridge) {
        const i = this._bridges.indexOf(bridge)
        if (i > -1) {
            this._bridges.splice(i, 1)
            bridge.bus = undefined
            this.emit(CHANGE)
        }
    }

    /**
     * Do not send any packet on the bus
     * @category Lifecycle
     */
    get passive(): boolean {
        return this._interactionMode === BusInteractionMode.Passive
    }

    /**
     * Sets the passive state. A passive bus does not send any packets.
     * @category Lifecycle
     * @deprecated
     */
    set passive(value: boolean) {
        this.interactionMode = value
            ? BusInteractionMode.Passive
            : BusInteractionMode.Active
    }

    /**
     * Determines how the bus interacts with services, including automatic polling of registers
     */
    get interactionMode(): BusInteractionMode {
        return this._interactionMode
    }

    /**
     * Sets how the bus interacts with services, including automatic polling of registers
     */
    set interactionMode(mode: BusInteractionMode) {
        if (this._interactionMode !== mode) {
            this._interactionMode = mode
            this.emit(CHANGE)
        }
    }

    /**
     * Indicates if reset in broadcast packets should be sent
     */
    get resetIn() {
        return this._resetIn
    }

    /**
     * Turns on or off reset in broadcast packets
     */
    set resetIn(value: boolean) {
        this._resetIn = !!value
    }

    private preConnect(transport: Transport) {
        //console.debug(`preconnect ${transport.type}`, { transport })
        return Promise.all(
            this._transports
                .filter(t => t !== transport)
                .map(t => t.disconnect()),
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
        this.configureBroadcastChannel()
        if (!this._announceInterval)
            this._announceInterval = this.scheduler.setInterval(() => {
                if (!this.passive) this.emit(SELF_ANNOUNCE)
            }, 499)
        this.backgroundRefreshRegisters = true
        if (!this._gcInterval)
            this._gcInterval = this.scheduler.setInterval(
                this.gcDevices.bind(this),
                JD_DEVICE_DISCONNECTED_DELAY,
            )
    }

    /**
     * Indicates if the bus is announcing and managing packets
     */
    get running() {
        return !!this._announceInterval
    }

    /**
     * Stops processing packets
     * @category Lifecycle
     */
    async stop() {
        await this.disconnect()
        if (this._unsubscribeBroadcastChannel) {
            this._postBroadcastMessage = undefined
            this._unsubscribeBroadcastChannel()
            this._unsubscribeBroadcastChannel = undefined
        }
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
        this.emit(DISPOSE)
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
                if (this._devices.some(d => d.firmwareUpdater)) return
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
        this.clearDevices()
        this.resetTime(timestamp)
        this.emit(CHANGE)
    }

    /**
     * Clears current device list and let's them repopulate
     */
    private clearDevices() {
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
        return this._roleManager
    }

    /**
     * Specifies the current role manager
     */
    setRoleManagerService(service: JDService) {
        // unchanged service
        if (this._roleManager?.service === service) return

        // service changed
        // clean if needed
        if (this._roleManager) {
            //console.debug("unmount role manager")
            this._roleManager.unmount()
            this._roleManager = undefined
        }

        // allocate new manager
        if (service) {
            this._roleManager = new RoleManagerClient(service)
            this._roleManager.startRefreshRoles()
        }

        // notify listeneres
        this.emit(ROLE_MANAGER_CHANGE)
        this.emit(CHANGE)
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
     * Gets a detailled description of the devices and services connected to the bus
     * @returns
     * @internal
     */
    describe(options?: DeviceFilter) {
        return `
interaction_mode: ${this.interactionMode}
auto_connect: ${this.autoConnect}
reset_in: ${this.resetIn}
last_reset_in_time: ${this.lastResetInTime}
transport:
${this._transports.map(tr => `  ${tr.type}: ${tr.connectionState}`).join("\n")}
${
    this._bridges?.length
        ? `bridges:
${this._bridges
    ?.map(
        tr =>
            `  ${tr.bridgeId}: recv ${tr.packetProcessed}, sent ${tr.packetSent}`,
    )
    .join("\n")}`
        : ""
}${this.devices(options)
            .map(
                dev => `device: 
  id: ${dev.shortId} (0x${dev.deviceId})
  product: ${dev.name || "?"} (0x${dev.productIdentifier?.toString(16) || "?"})
  firmware_version: ${dev.firmwareVersion || ""}
  uptime: ${dev.uptime || ""}
  stats: ${dev.stats.toString()}
  services:
${dev
    .services()
    .slice(1)
    .map(srv =>
        [
            `    ${
                srv.specification?.shortName || srv.name
            } (0x${srv.serviceClass.toString(16)})`,
            ...srv
                .registers()
                .filter(reg => !!reg.data)
                .map(
                    reg =>
                        `        ${reg.specification?.kind || "reg"} ${
                            reg.name
                        }${reg.needsRefresh ? "*" : ""}: ${
                            reg.humanValue
                        } (${toHex(reg.data)}) ${
                            reg.notImplemented ? "- not implemented" : ""
                        }
            last data: ${reg.lastDataTimestamp | 0 || ""}, last get: ${
                reg.lastGetTimestamp | 0 || ""
            }, last set: ${
                reg.lastSetTimestamp | 0 || ""
            }, last gets attempts: ${reg.lastGetAttempts},`,
                ),
            ...srv.events
                .filter(ev => ev.count > 0)
                .map(ev => `        event ${ev.name}: ${ev.count}`),
        ].join("\n"),
    )
    .join("\n")}
`,
            )
            .join("\n")}`
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
                    id,
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
     * Indicates if the bus should force all sensors to stream
     * @category Lifecycle
     */
    get streaming(): boolean {
        return this._streaming
    }

    /**
     * Sets automatic streaming on and off
     * @category Lifecycle
     */
    set streaming(value: boolean) {
        this._streaming = value
    }

    /**
     * Creates a promise that awaits for the given duration using the bus scheduler
     * @category Scheduling
     */
    delay<T>(millis: number, value?: T): Promise<T | undefined> {
        return new Promise(resolve =>
            this.scheduler.setTimeout(() => resolve(value), millis),
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
            this._lastPingLoggerTime = -Infinity
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

    private handleRoleManager(dev: JDDevice) {
        // device restarted and refreshed services
        if (this._roleManager?.service?.disposed) {
            this.setRoleManagerService(undefined)
        }

        // role manager device got disconnected
        if (!dev.connected && this._roleManager?.service?.device === dev) {
            // find another
            this.setRoleManagerService(undefined)
        }

        if (!this.roleManager) {
            const service = this.services({ serviceClass: SRV_ROLE_MANAGER })[0]
            if (service) this.setRoleManagerService(service)
        }
    }

    async sendFrameAsync(frame: JDFrameBuffer) {
        if (frame._jacdac_timestamp === undefined)
            frame._jacdac_timestamp = this.timestamp
        if (isLargeFrame(frame)) {
            this.processLargeFrame(frame)
            return
        }
        this.emit(FRAME_SEND, frame)
        // loopback processing:
        this.processFrame(frame, frame._jacdac_sender)
        await Promise.all(
            this._transports.map(transport =>
                transport.sendPacketWhenConnectedAsync(frame),
            ),
        )
    }

    /**
     * Sends a packet to the bus
     * @param packet packet to send
     * @internal
     */
    async sendPacketAsync(packet: Packet) {
        packet.timestamp = this.timestamp
        if (Flags.trace) packet.meta[META_TRACE] = stack()

        // special debug mode to avoid dashboard interfere with packets
        // will generate fails for acks
        if (this.passive) return

        this.emit(PACKET_SEND, packet)

        await this.sendFrameAsync(packet.toBuffer())
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
        if (options?.ignoreInfrastructure)
            r = r.filter(
                s =>
                    s.deviceId !== this.selfDeviceId &&
                    s.serviceClasses.indexOf(SRV_INFRASTRUCTURE) < 0,
            )
        if (options?.announced) r = r.filter(s => s.announced)
        if (options?.ignoreSimulators)
            r = r.filter(r => !this.findServiceProvider(r.deviceId))
        if (options?.productIdentifier) r = r.filter(r => !!r.productIdentifier)
        if (options?.physical) r = r.filter(r => !!r.isPhysical)
        if (options?.lost !== undefined)
            r = r.filter(r => !!r.lost === !!options?.lost)
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
            this.removeDevice(provider.deviceId)
            // remove host
            this._serviceProviders.splice(i, 1)
            provider.bus = undefined
            this.emit(SERVICE_PROVIDER_REMOVED, provider)

            // removed host
            this.emit(CHANGE)
        }
    }

    /**
     * Removes all service providers from the bus
     * @category Services
     */
    clearServiceProviders() {
        this._serviceProviders.forEach(provider => {
            this.removeDevice(provider.deviceId)
            provider.bus = undefined
            this.emit(SERVICE_PROVIDER_REMOVED, provider)
        })
        this._serviceProviders = []
        this.emit(CHANGE)
    }

    /**
     * Remove a device client by identifier
     * @param deviceId
     * @category Devices
     */
    removeDevice(deviceId: string) {
        // remove device as well
        const devi = this._devices.findIndex(d => d.deviceId === deviceId)
        if (devi > -1) {
            const dev = this._devices[devi]
            this._devices.splice(devi, 1)
            dev.disconnect()
            this.emit(DEVICE_DISCONNECT, dev)
            this.emit(DEVICE_CHANGE, dev)
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
            this.devices(options).map(d => d.services(options)),
        )
    }

    /**
     * Gets a device on the bus
     * @param id device identifier to query
     * @param skipCreate do not create new device if missing
     * @param pkt packet that generated this device query
     * @category Services
     */
    device(
        id: string,
        skipCreate?: boolean,
        pkt?: Packet,
    ): JDDevice | undefined {
        if (id === "0000000000000000" && !skipCreate) {
            console.warn("jacdac: trying to access device 0000000000000000")
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
            if (Flags.diagnostics)
                console.debug(
                    `${id === this.selfDeviceId ? "self" : "new"} device ${
                        d.shortId
                    } (${id})`,
                )
            // stable sort
            this._devices.sort((l, r) => strcmp(l.deviceId, r.deviceId))
            this.emit(DEVICE_CONNECT, d)
            this.emit(DEVICE_CHANGE, d)
            this.emit(CHANGE)
        }
        return d
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
        const now = this.timestamp
        const lostCutoff = now - LOST_DELAY
        const disconnectedCutoff = now - DISCONNECTED_DELAY

        // cycle through events and disconnect devices that are long gone
        let changed = false
        const devs = this._devices.slice(0)
        while (devs.length) {
            const dev = devs.pop()
            if (dev === this.selfDevice) continue
            if (dev.firmwareUpdater) continue
            if (dev.lastSeen < disconnectedCutoff) {
                const i = this._devices.indexOf(dev)
                if (i > -1) this._devices.splice(i, 1)
                dev.disconnect()
                this.emit(DEVICE_DISCONNECT, dev)
                this.emit(DEVICE_CHANGE, dev)
                changed = true
            } else if (dev.lastSeen < lostCutoff) {
                dev.lost = true
                changed = true
            }
        }
        if (changed) {
            this.emit(CHANGE)
        }
    }

    /**
     * Ingests and process a packet received from the bus.
     * @param pkt a jacdac packet
     * @internal
     */
    private processPacket(pkt: Packet) {
        // this is currently unused - outside code typically calls sendFrameAsync() (possibly via sendPacketAsync())
        // which in turn calls processFrame()
        const frame = pkt.toBuffer()
        if (!frame._jacdac_timestamp) frame._jacdac_timestamp = this.timestamp
        this.emit(FRAME_PROCESS, pkt.toBuffer())
        this.processPacketCore(pkt)
    }

    // this is called by sendFrameAsync() internally and by transports
    processFrame(frame: JDFrameBuffer, sender: string, skipCrc = false) {
        if (sender) frame._jacdac_sender = sender
        if (frame._jacdac_timestamp === undefined)
            frame._jacdac_timestamp = this.timestamp
        if (isLargeFrame(frame)) {
            this.processLargeFrame(frame)
            return
        }
        this.emit(FRAME_PROCESS, frame)
        for (const pkt of Packet.fromFrame(
            frame,
            frame._jacdac_timestamp,
            skipCrc,
        )) {
            if (frame._jacdac_replay) pkt.replay = true
            this.processPacketCore(pkt)
        }
    }

    private processLargeFrame(frame: JDFrameBuffer) {
        if (!this.passive) {
            // don't try to route large packet in a passive bus
            const did = toHex(frame.slice(8, 8))
            const device = this.device(did, true)
            if (device) {
                // decode the topic?
                const [topic, data]: [string, Uint8Array] = jdunpack(
                    frame.slice(16),
                    "z b",
                )
                const { si, command } =
                    /^jd\/(?<si>\d+)\/(?<command>.+)$/.exec(topic)?.groups || {}
                const serviceIndex = parseInt(si)
                if (serviceIndex > 0) {
                    const service = device.service(serviceIndex)
                    const twin = service?.twin
                    if (twin) twin.processLargeFrame(command, data)
                }
            }
        }
        this.emit(FRAME_PROCESS_LARGE, frame)
    }

    private processPacketCore(pkt: Packet) {
        pkt.assignDevice(this)
        if (!pkt.isMultiCommand && !pkt.device) {
            // the device id is unknown dropping
            if (Flags.diagnostics)
                console.debug(`unknown pkt device ${pkt.deviceIdentifier}`, {
                    pkt,
                })
            this.emit(PACKET_RECEIVE_NO_DEVICE, pkt)
            return
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
            if (pkt.isEvent && !pkt.isRepeatedEvent)
                this.emit(PACKET_EVENT, pkt)
            else if (pkt.isReport) this.emit(PACKET_REPORT, pkt)
        }
    }

    /**
     * Gets the current list of service specifications
     */
    get serviceSpecifications() {
        return serviceSpecifications()
    }

    /**
     * Updates the current list of device and clears the bus
     * @param services
     */
    setCustomServiceSpecifications(services: jdspec.ServiceSpec[]) {
        const res = loadServiceSpecifications(services)
        if (res.changed) {
            this.clearDevices()
            this.emit(CHANGE)
        }
        return res
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
            this.sendPingLoggers(),
        ]).then(() => {})
    }

    private async sendAnnounce() {
        // we do not support any services (at least yet)
        if (this._restartCounter < 0xf) this._restartCounter++
        const pkt = Packet.jdpacked<[number, number[][]]>(
            CMD_ADVERTISEMENT_DATA,
            "u32 r: u32",
            [
                this._restartCounter |
                    (this._client ? ControlAnnounceFlags.IsClient : 0) |
                    ControlAnnounceFlags.SupportsBroadcast |
                    ControlAnnounceFlags.SupportsFrames |
                    ControlAnnounceFlags.SupportsACK,
                [
                    [SRV_INFRASTRUCTURE],
                    this._dashboard ? [SRV_DASHBOARD] : undefined,
                    this._proxy ? [SRV_PROXY] : undefined,
                ].filter(sc => !!sc),
            ],
        )
        pkt.serviceIndex = JD_SERVICE_INDEX_CTRL
        pkt.deviceIdentifier = this.selfDeviceId
        await pkt.sendReportAsync(this.selfDevice)
    }

    get lastResetInTime() {
        return this._lastResetInTime
    }

    private async sendResetIn() {
        if (!this.resetIn) return

        // don't send reset if already received
        // or no devices
        if (!this.devices({ ignoreInfrastructure: true }).length) return
        this._lastResetInTime = this.timestamp
        const rst = Packet.jdpacked<[number]>(
            CMD_SET_REG | ControlReg.ResetIn,
            "u32",
            [RESET_IN_TIME_US],
        )
        await rst.sendAsMultiCommandAsync(this, SRV_CONTROL)
    }

    public async sendStopStreaming(): Promise<void> {
        //console.debug(`bus: stop streaming`)
        const readingRegisters = this.services({
            announced: true,
            ignoreInfrastructure: true,
        })
            .map(
                srv =>
                    srv.readingRegister &&
                    srv.register(SensorReg.StreamingSamples),
            )
            .filter(reg => !!reg)

        await Promise.all(
            readingRegisters.map(reg => reg.sendSetPackedAsync([0])),
        )
    }

    private async sendPingLoggers() {
        if (
            this._minLoggerPriority < LoggerPriority.Silent &&
            this.timestamp - this._lastPingLoggerTime > PING_LOGGERS_POLL &&
            this.devices({
                ignoreInfrastructure: true,
                serviceClass: SRV_LOGGER,
            }).length > 0
        ) {
            this._lastPingLoggerTime = this.timestamp
            const pkt = Packet.jdpacked<[LoggerPriority]>(
                CMD_SET_REG | LoggerReg.MinPriority,
                "u8",
                [this._minLoggerPriority],
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
                    REFRESH_REGISTER_POLL,
                )
            }
        }
    }

    /**
     * Cycles through all known registers and refreshes the once that have REPORT_UPDATE registered
     */
    private handleRefreshRegisters() {
        // never poll registers in passive/observer mode
        if (this.interactionMode !== BusInteractionMode.Active) return

        const devices = this._devices.filter(
            device =>
                device.announced && // needs services
                !device.lost && // ignore lost devices
                // !device.hasService(SRV_PROXY) && // proxies run servers!
                !device.firmwareUpdater,
        )

        // skip if no devices or any device is currently flashing
        if (!devices.length) return // no devices, we're done

        // collect registers
        const registers = arrayConcatMany(
            devices.map(device =>
                arrayConcatMany(
                    device.services({ specification: true }).map(service =>
                        service
                            .registers()
                            // reported as not implemented
                            .filter(reg => !reg.notImplemented)
                            // someone is listening for reports
                            .filter(
                                reg =>
                                    // automatic streaming
                                    (this._streaming &&
                                        reg.code === SystemReg.Reading) ||
                                    // someone asked for the value
                                    reg.needsRefresh ||
                                    // listening for updates
                                    reg.listenerCount(REPORT_RECEIVE) > 0 ||
                                    reg.listenerCount(REPORT_UPDATE) > 0,
                            )
                            // ask if data is missing or non-const/status code
                            .filter(
                                reg =>
                                    !reg.data ||
                                    !isConstRegister(reg.specification),
                            )
                            // stop asking optional registers
                            .filter(
                                reg =>
                                    !reg.specification?.optional ||
                                    reg.lastGetAttempts <
                                        REGISTER_OPTIONAL_POLL_COUNT,
                            ),
                    ),
                ),
            ),
        )

        // refresh values
        for (const register of registers) {
            const { lastGetAttempts, service, specification } = register
            const noDataYet = !register.data
            const age = this.timestamp - register.lastGetTimestamp
            const backoff = lastGetAttempts

            // needs refresh and first attempt
            if (register.needsRefresh && lastGetAttempts == 0) {
                register.sendGetAsync()
            }
            // streaming register? use streaming sample
            else if (
                isReading(specification) &&
                isSensor(service.specification)
            ) {
                // compute refresh interval
                const intervalRegister = service.register(
                    SensorReg.StreamingInterval,
                )
                let interval = intervalRegister?.uintValue
                // no interval data
                if (interval === undefined) {
                    // use preferred interval data or default to 50
                    const preferredIntervalRegister = service.register(
                        SensorReg.StreamingPreferredInterval,
                    )
                    const preferredInterval =
                        preferredIntervalRegister?.uintValue
                    interval = preferredInterval
                    // if no interval, poll interval value
                    if (interval === undefined) {
                        // all async
                        if (
                            intervalRegister &&
                            !intervalRegister.data &&
                            this.timestamp - intervalRegister.lastGetTimestamp >
                                REGISTER_POLL_STREAMING_INTERVAL
                        )
                            intervalRegister.sendGetAsync()

                        if (
                            preferredIntervalRegister &&
                            !preferredIntervalRegister.data &&
                            this.timestamp -
                                preferredIntervalRegister.lastGetTimestamp >
                                REGISTER_POLL_STREAMING_INTERVAL
                        )
                            preferredIntervalRegister.sendGetAsync()
                    }
                }
                // still no interval data use from spec or default
                if (interval === undefined)
                    interval =
                        specification.preferredInterval ||
                        STREAMING_DEFAULT_INTERVAL
                const streamingSamplesRegister = service.register(
                    SensorReg.StreamingSamples,
                )
                if (streamingSamplesRegister) {
                    const streamingSamplesAge =
                        this.timestamp -
                        streamingSamplesRegister.lastSetTimestamp
                    // need to figure out when we asked for streaming
                    const midSamplesAge = (interval * 0xff) >> 1
                    // compute if half aged
                    if (streamingSamplesAge > midSamplesAge) {
                        //console.debug({ samplesAge, midSamplesAge, interval })
                        streamingSamplesRegister.sendSetPackedAsync([0xff])
                    }
                }

                // no data yet
                else if (noDataYet && age > 500) {
                    register.sendGetAsync()
                }
            } // regular register, ping if data is old
            else {
                // check age
                const volatile = !!specification?.volatile
                const expiration = volatile
                    ? Math.min(
                          REGISTER_POLL_REPORT_VOLATILE_MAX_INTERVAL,
                          REGISTER_POLL_REPORT_VOLATILE_INTERVAL *
                              (1 << backoff),
                      )
                    : Math.min(
                          REGISTER_POLL_REPORT_MAX_INTERVAL,
                          (noDataYet
                              ? REGISTER_POLL_FIRST_REPORT_INTERVAL
                              : REGISTER_POLL_REPORT_INTERVAL) *
                              (1 << backoff),
                      )
                if (age > expiration) {
                    //console.log(`bus: poll ${register.id}`, register, age, backoff, expiration)
                    register.sendGetAsync()
                }
            }
        }

        // apply streaming samples to service provider
        this.emit(REFRESH)
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
                },
            )
        })
    }
}

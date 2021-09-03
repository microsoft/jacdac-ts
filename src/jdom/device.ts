import Packet from "./packet"
import {
    JD_SERVICE_INDEX_CTRL,
    DEVICE_ANNOUNCE,
    DEVICE_CHANGE,
    ANNOUNCE,
    DISCONNECT,
    JD_ADVERTISEMENT_0_COUNTER_MASK,
    DEVICE_RESTART,
    RESTART,
    CHANGE,
    PACKET_RECEIVE,
    PACKET_REPORT,
    PACKET_EVENT,
    FIRMWARE_INFO,
    DEVICE_FIRMWARE_INFO,
    ControlCmd,
    DEVICE_NODE_NAME,
    LOST,
    DEVICE_LOST,
    DEVICE_FOUND,
    FOUND,
    JD_SERVICE_INDEX_CRC_ACK,
    ACK_MIN_DELAY,
    ACK_MAX_DELAY,
    ControlReg,
    USB_TRANSPORT,
    PACKETIO_TRANSPORT,
    META_ACK_FAILED,
    ControlAnnounceFlags,
    IDENTIFY_DURATION,
    PACKET_ANNOUNCE,
    BLUETOOTH_TRANSPORT,
    ERROR,
    SRV_CONTROL,
    SRV_LOGGER,
    REPORT_UPDATE,
    SERIAL_TRANSPORT,
    WEBSOCKET_TRANSPORT,
} from "./constants"
import { read32, bufferEq, setAckError, read16 } from "./utils"
import { getNumber, NumberFormat } from "./buffer"
import JDBus from "./bus"
import JDService from "./service"
import { serviceClass, shortDeviceId } from "./pretty"
import JDNode from "./node"
import { isInstanceOf } from "./spec"
import { FirmwareInfo } from "./flashing"
import LEDController from "./ledcontroller"
import JDEventSource from "./eventsource"
import { ServiceFilter } from "./filters/servicefilter"

/**
 * Pipe information
 * @category Runtime
 */
export interface PipeInfo {
    pipeType?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    localPipe?: any
}

interface AckAwaiter {
    pkt: Packet
    retriesLeft: number
    okCb: () => void
    errCb: () => void
}

/**
 * Collects packet statistics about the device
 * @category JDOM
 */
export class DeviceStats extends JDEventSource {
    // counter
    private _receivedPackets = 0
    private _restarts = 0

    // horizon
    private readonly _data: {
        received: number
        total: number
        restarts: number
    }[] = Array(10)
        .fill(0)
        .map(() => ({ received: 0, total: 0, restarts: 0 }))
    private _dataIndex = 0

    /**
     * @internal
     */
    constructor() {
        super()
    }

    /**
     * Average packet dropped per announce period
     * @category Statistics
     */
    get dropped(): number {
        const r =
            this._data
                .filter(e => !!e.total) // ignore total 0
                .reduce((s, e) => s + (e.total - e.received), 0) /
                this._data.length || 0
        return r
    }

    /**
     * Average restart detected per announce packet
     */
    get restarts(): number {
        const r =
            this._data.reduce((s, e) => s + e.restarts, 0) /
                this._data.length || 0
        return r
    }

    /**
     * @internal
     */
    processAnnouncement(pkt: Packet) {
        // collect metrics
        const received = this._receivedPackets
        const total = pkt.data[2]
        const restarts = this._restarts

        this._data[this._dataIndex] = { received, total, restarts }
        this._dataIndex = (this._dataIndex + 1) % this._data.length

        // reset counter
        this._receivedPackets = 0
        this._restarts = 0
        this.emit(CHANGE)
    }

    /**
     * @internal
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    processPacket(pkt: Packet) {
        this._receivedPackets++
    }

    /**
     * @internal
     */
    processRestart() {
        this._restarts++
    }
}

/**
 * A Jacdac device hosting services.
 * @category JDOM
 */
export class JDDevice extends JDNode {
    /**
     * Indicates if the device is connected to a bus
     * @category Lifecycle
     */
    connected: boolean
    private _source: string
    private _replay: boolean
    private _lost: boolean
    private _servicesData: Uint8Array
    private _statusLight: LEDController
    /**
     * Timestamp of the last packet received from the device
     * @category Lifecycle
     */
    lastSeen: number
    /**
     * Timestamp of the last service update packet received from the device
     * @category Lifecycle
     */
    lastServiceUpdate: number
    private _shortId: string
    private _services: JDService[]
    private _ports: Record<string, PipeInfo>
    private _firmwareInfo: FirmwareInfo
    private _ackAwaiting: AckAwaiter[]
    private _flashing = false
    private _identifying: boolean
    private _eventCounter: number
    /**
     * Gets the bus this device belongs to
     * @category JDOM
     */
    public readonly bus: JDBus
    /**
     * Gets the device identifier
     * @category Control
     */
    public readonly deviceId: string

    /**
     * @internal
     */
    constructor(bus: JDBus, deviceId: string, pkt?: Packet) {
        super()
        this.bus = bus
        this.deviceId = deviceId
        this.connected = true
        this._lost = false
        this._identifying = false

        this._source = pkt?.sender
        this._replay = !!pkt?.replay
    }

    /**
     * Quality of service statistics for this device
     * @category Diagnostics
     */
    readonly stats = new DeviceStats()

    /**
     * Gets a description of the device.
     * @returns a descriptive string for this device
     * @category Diagnostics
     */
    describe() {
        const ignoredServices = [SRV_CONTROL, SRV_LOGGER]
        return (
            this.toString() +
            (this.isPhysical ? "" : " (sim)") +
            ": " +
            this.services()
                .filter(srv => ignoredServices.indexOf(srv.serviceClass) < 0)
                .map(
                    s =>
                        s.instanceName ||
                        s.specification?.camelName ||
                        s.serviceClass.toString(16)
                )
                .join(", ")
        )
    }

    /**
     * Gets a unique identifier for this device in the bus
     * @category JDOM
     */
    get id() {
        return `${this.nodeKind}:${this.deviceId}`
    }

    /**
     * Gets the short id of the device
     * @category JDOM
     */
    get name() {
        return this.shortId
    }

    /**
     * Identifies node as a device
     * @category JDOM
     */
    get nodeKind() {
        return DEVICE_NODE_NAME
    }

    /**
     * Indicates if the devices is a physical device, not emulated.
     * @category Transport
     */
    get isPhysical() {
        return (
            this._source === USB_TRANSPORT ||
            this._source === BLUETOOTH_TRANSPORT ||
            this._source === SERIAL_TRANSPORT ||
            this._source === PACKETIO_TRANSPORT ||
            this._source === WEBSOCKET_TRANSPORT
        )
    }

    /**
     * Indicates the source of packets
     * @category Transport
     */
    get source() {
        return this._source
    }

    /**
     * Indicates if the device is part of a trace replay
     * @category Transport
     */
    get replay() {
        return this._replay
    }

    /**
     * Gets the device short name
     * @category JDOM
     */
    get friendlyName() {
        return this.shortId
    }

    /**
     * Gets the device short name
     * @category JDOM
     */
    get qualifiedName() {
        return this.shortId
    }

    /**
     * Indicates if service information is available.
     * This happens after a announce packet has been received.
     * @category Lifecycle
     */
    get announced(): boolean {
        return !!this._servicesData?.length
    }

    /**
     * Gets the control announce flag from the annouce packet.
     * @category Control
     */
    get announceFlags(): ControlAnnounceFlags {
        return this._servicesData ? read16(this._servicesData, 0) : 0
    }

    /**
     * Gets the restart counter from the announce packet.
     * @category Control
     */
    get restartCounter(): number {
        return this.announceFlags & ControlAnnounceFlags.RestartCounterSteady
    }

    /**
     * Gets the status light announce flags from the announce packet.
     * @category Control
     */
    get statusLightFlags(): ControlAnnounceFlags {
        return this.announceFlags & ControlAnnounceFlags.StatusLightRgbFade
    }

    /**
     * Indicates if the device is announced as a client
     * @category Control
     */
    get isClient() {
        return !!(this.announceFlags & ControlAnnounceFlags.IsClient)
    }

    /**
     * Gets the number of packets sent since the last announce packet,
     * as read from the announce packet.
     * @category Control
     */
    get packetCount(): number {
        return this._servicesData?.[2] || 0
    }

    /**
     * Gets the device short identifier
     * @category JDOM
     */
    get shortId() {
        // TODO measure if caching is worth it
        if (!this._shortId) this._shortId = shortDeviceId(this.deviceId)
        return this._shortId
    }

    /**
     * Gets the bus instance hosting this device.
     * @category JDOM
     */
    get parent(): JDNode {
        return this.bus
    }

    /**
     * Gets the firmware information if any.
     * @category Firmware
     */
    get firmwareInfo() {
        return this._firmwareInfo
    }

    /**
     * Sets the firmware information.
     * @category Firmware
     */
    set firmwareInfo(info: FirmwareInfo) {
        const changed =
            JSON.stringify(this._firmwareInfo) !== JSON.stringify(info)
        if (changed) {
            this._firmwareInfo = info
            this.bus.emit(DEVICE_FIRMWARE_INFO, this)
            this.emit(FIRMWARE_INFO)
            this.bus.emit(DEVICE_CHANGE, this)
            this.emit(CHANGE)
        }
    }

    /**
     * Indicates if no packet from this device has been observed in a while.
     * @category Lifecycle
     */
    get lost() {
        return this._lost
    }

    /**
     * Sets the lost status
     * @category Lifecycle
     * @internal
     */
    set lost(v: boolean) {
        if (!!v === this._lost) return

        // something changed
        this._lost = !!v
        if (this.lost) {
            this.emit(LOST)
            this.bus.emit(DEVICE_LOST, this)
        } else {
            this.emit(FOUND)
            this.bus.emit(DEVICE_FOUND, this)
        }
        this.emit(CHANGE)
        this.bus.emit(DEVICE_CHANGE, this)
        this.bus.emit(CHANGE)
    }

    /**
     * A flashing sequence is in progress
     * @category Firmware
     */
    get flashing() {
        return this._flashing
    }

    /**
     * Sets the flashing sequence state
     * @category Firmware
     */
    set flashing(value: boolean) {
        if (value !== this._flashing) {
            this._flashing = value
            this.emit(CHANGE)
            this.bus.emit(DEVICE_CHANGE, this)
            this.bus.emit(CHANGE)
        }
    }

    /**
     * Gets the number of events received by the service clients in this device
     * @category Lifecycle
     */
    get eventCounter() {
        return this._eventCounter
    }

    /**
     * @internal
     */
    set eventCounter(v: number) {
        this._eventCounter = v
    }

    /**
     * Indicates if the device contains at least one service matching the service class
     * @param serviceClass service class to match
     * @returns true if at least one service present
     * @category Services
     */
    hasService(serviceClass: number): boolean {
        if (!this.announced) return false
        if (serviceClass === 0) return true

        // skip first 4 bytes
        for (let i = 4; i < this._servicesData.length; i += 4) {
            const sc = getNumber(this._servicesData, NumberFormat.UInt32LE, i)
            if (isInstanceOf(sc, serviceClass)) return true
        }
        return false
    }

    /**
     * Gets or allocates a pipe port
     * @param id identifier of the port
     * @returns a pipe port
     * @category Services
     */
    port(id: number) {
        if (!this._ports) this._ports = {}
        const key = id + ""
        const ex = this._ports[key]
        if (!ex) return (this._ports[key] = {})
        return ex
    }

    /**
     * Gets the number of services hosted by the device
     * @category Services
     */
    get serviceLength() {
        if (!this.announced) return 0
        return this._servicesData.length >> 2
    }

    /**
     * Gets the service class at a given index
     * @param index index of the service
     * @returns service class
     * @category Services
     */
    serviceClassAt(index: number): number {
        if (index == 0) return 0

        index <<= 2
        if (!this.announced || index + 4 > this._servicesData.length)
            return undefined
        return read32(this._servicesData, index)
    }

    /**
     * Gets the list of service classes
     * @category Services
     */
    get serviceClasses(): number[] {
        const r = []
        const n = this.serviceLength
        for (let i = 0; i < n; ++i) r.push(this.serviceClassAt(i))
        return r
    }

    private initServices(force?: boolean) {
        if (force) this._services = undefined

        if (!this._services && this._servicesData) {
            this._statusLight = undefined
            const n = this.serviceLength
            const s = []
            for (let i = 0; i < n; ++i) s.push(new JDService(this, i))
            this._services = s
            this.lastServiceUpdate = this.bus.timestamp

            // listen for specific registers
            const ctrl = this._services?.[0]
            const codes = [ControlReg.ProductIdentifier]
            codes.forEach(code =>
                ctrl.register(code).once(REPORT_UPDATE, () => this.emit(CHANGE))
            )
        }
    }

    /**
     * Gets the service client at the given service index
     * @param serviceIndex index of the service client
     * @returns service client
     * @category Services
     */
    service(serviceIndex: number): JDService {
        if (!this.announced) return undefined
        this.initServices()
        serviceIndex = serviceIndex | 0
        return this._services && this._services[serviceIndex]
    }

    /**
     * Gets a filtered list of service clients.
     * @param options filters for services
     * @returns services matching the filter
     * @category Services
     */
    services(options?: ServiceFilter): JDService[] {
        if (!this.announced) return []

        if (options?.serviceIndex >= 0)
            return [this.service(options?.serviceIndex)]

        if (options?.serviceName && options?.serviceClass > -1)
            throw Error("serviceClass and serviceName cannot be used together")
        let sc = serviceClass(options?.serviceName)
        if (sc === undefined || sc < 0) sc = options?.serviceClass
        if (sc === undefined) sc = -1

        this.initServices()
        let r = this._services?.slice() || []
        if (sc > -1) r = r.filter(s => s.serviceClass == sc)

        if (options?.specification) r = r.filter(s => !!s.specification)

        const mixins = options?.mixins
        if (mixins !== undefined) r = r.filter(s => s.isMixin === mixins)

        return r
    }

    /**
     * Gets the list of child services.
     * @category JDOM
     */
    get children(): JDNode[] {
        return this.services()
    }

    /**
     * @internal
     */
    sendCtrlCommand(cmd: number, payload: Uint8Array = null) {
        const pkt = !payload
            ? Packet.onlyHeader(cmd)
            : Packet.from(cmd, payload)
        pkt.serviceIndex = JD_SERVICE_INDEX_CTRL
        return pkt.sendCmdAsync(this)
    }

    /**
     * @internal
     */
    processAnnouncement(pkt: Packet) {
        this.stats.processAnnouncement(pkt)

        let changed = false
        const w0 = this._servicesData
            ? getNumber(this._servicesData, NumberFormat.UInt32LE, 0)
            : 0
        const w1 = getNumber(pkt.data, NumberFormat.UInt32LE, 0)

        // compare service data
        const servicesChanged = !bufferEq(pkt.data, this._servicesData, 4)
        this._servicesData = pkt.data

        // check for restart
        if (
            w1 &&
            (w1 & JD_ADVERTISEMENT_0_COUNTER_MASK) <
                (w0 & JD_ADVERTISEMENT_0_COUNTER_MASK)
        ) {
            this.stats.processRestart()
            this.initServices(true)
            this.bus.emit(DEVICE_RESTART, this)
            this.emit(RESTART)
            changed = true
        }

        // notify that services got updated
        if (servicesChanged) {
            if (!changed) this.initServices(true)
            this.bus.emit(DEVICE_ANNOUNCE, this)
            this.emit(ANNOUNCE)
            changed = true
        }

        // notify that we've received an announce packet
        this.emit(PACKET_ANNOUNCE)

        // notify of any changes
        if (changed) {
            this.bus.emit(DEVICE_CHANGE, this)
            this.bus.emit(CHANGE)
            this.emit(CHANGE)
        }
    }

    /**
     * @internal
     */
    processPacket(pkt: Packet) {
        this.stats.processPacket(pkt)
        this.lost = false
        this.emit(PACKET_RECEIVE, pkt)
        if (pkt.isReport) this.emit(PACKET_REPORT, pkt)
        else if (pkt.isEvent) this.emit(PACKET_EVENT, pkt)

        const service = this.service(pkt.serviceIndex)
        if (service) service.processPacket(pkt)
    }

    /**
     * @internal
     */
    disconnect() {
        this.connected = false
        this.emit(DISCONNECT)
        this.emit(CHANGE)
    }

    /**
     * Gets a controller for the status light, if any
     * @category Control
     */
    get statusLight(): LEDController {
        if (
            !this._statusLight &&
            this.statusLightFlags !== ControlAnnounceFlags.StatusLightNone
        )
            this._statusLight = new LEDController(
                this.service(0),
                ControlCmd.SetStatusLight
            )
        return this._statusLight
    }

    /**
     * Sends an ``identify`` command to the device
     * @category Lifecycle
     */
    async identify() {
        if (this._identifying) return

        try {
            this._identifying = true
            this.emit(CHANGE)
            const statusLight = this.statusLight
            if (statusLight) await statusLight.blink(0x0000ff, 0, 262, 4)
            else {
                const ctrl = this.service(0)
                await ctrl.sendCmdAsync(ControlCmd.Identify, undefined, false)
                await this.bus.delay(IDENTIFY_DURATION)
            }
        } catch (e) {
            this.emit(ERROR, e)
        } finally {
            this._identifying = false
            this.emit(CHANGE)
        }
    }

    /**
     * Indicates the device should be identifying.
     * @category Lifecycle
     */
    get identifying() {
        return this._identifying
    }

    /**
     * Sends a ``reset`` command to the device
     * @category Lifecycle
     */
    reset() {
        return this.service(0)?.sendCmdAsync(ControlCmd.Reset)
    }

    /**
     * Tries to retrive the product identifier from the device
     * @param retry number of devices
     * @returns promise that returns product identifier if received
     * @category Control
     */
    async resolveProductIdentifier(retry = 0): Promise<number> {
        const fwIdRegister = this.service(0)?.register(
            ControlReg.ProductIdentifier
        )
        if (!fwIdRegister) return undefined

        while (retry-- >= 0 && fwIdRegister.data === undefined)
            await fwIdRegister.refresh(true)
        return fwIdRegister.uintValue
    }

    /**
     * Returns the product identifier synchronously. If needed, tries to refresh the value in the background.
     * @category Control
     */
    get productIdentifier(): number {
        const fwIdRegister = this.service(0)?.register(
            ControlReg.ProductIdentifier
        )
        const v = fwIdRegister?.uintValue
        if (fwIdRegister && v === undefined) fwIdRegister?.refresh(true)
        return v
    }

    private initAcks() {
        if (this._ackAwaiting) return

        this._ackAwaiting = []
        this.on(PACKET_REPORT, (rep: Packet) => {
            if (rep.serviceIndex != JD_SERVICE_INDEX_CRC_ACK) return
            let numdone = 0
            for (const aa of this._ackAwaiting) {
                if (aa.pkt && aa.pkt.crc == rep.serviceCommand) {
                    //console.log(`ack`, aa.pkt)
                    aa.pkt = null
                    numdone++
                    aa.okCb()
                }
            }
            if (numdone)
                this._ackAwaiting = this._ackAwaiting.filter(aa => !!aa.pkt)
        })

        const resend = () => {
            let numdrop = 0
            for (const aa of this._ackAwaiting) {
                if (aa.pkt) {
                    if (--aa.retriesLeft < 0) {
                        aa.pkt.meta[META_ACK_FAILED] = true
                        aa.pkt = null
                        aa.errCb()
                        numdrop++
                    } else {
                        aa.pkt.sendCmdAsync(this)
                    }
                }
            }
            if (numdrop)
                this._ackAwaiting = this._ackAwaiting.filter(aa => !!aa.pkt)
            setTimeout(
                resend,
                Math.random() * (ACK_MAX_DELAY - ACK_MIN_DELAY) + ACK_MIN_DELAY
            )
        }

        // start loop
        setTimeout(resend, 40)
    }

    /**
     * @internal
     */
    sendPktWithAck(pkt: Packet) {
        pkt.requiresAck = true
        this.initAcks()
        return new Promise<void>((resolve, reject) => {
            const ack = {
                pkt,
                retriesLeft: 4,
                okCb: resolve,
                errCb: () => {
                    const e = new Error("No ACK for " + pkt.toString())
                    setAckError(e)
                    reject(e)
                },
            }
            this._ackAwaiting.push(ack)
            pkt.sendCmdAsync(this)
        })
    }

    /**
     * @internal
     */
    async floodPing(numPkts = 100, size = 32) {
        const pkt = Packet.jdpacked(ControlCmd.FloodPing, "u32 u32 u8", [
            numPkts,
            0x1000,
            size,
        ])
        pkt.serviceIndex = JD_SERVICE_INDEX_CTRL
        await this.sendPktWithAck(pkt)
    }
}

export default JDDevice

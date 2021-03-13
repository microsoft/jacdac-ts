import Packet from "./packet"
import {
    JD_SERVICE_INDEX_CTRL, DEVICE_ANNOUNCE, DEVICE_CHANGE, ANNOUNCE, DISCONNECT, JD_ADVERTISEMENT_0_COUNTER_MASK, DEVICE_RESTART, RESTART, CHANGE,
    PACKET_RECEIVE, PACKET_REPORT, PACKET_EVENT, FIRMWARE_INFO, DEVICE_FIRMWARE_INFO, ControlCmd, DEVICE_NODE_NAME, LOST,
    DEVICE_LOST, DEVICE_FOUND, FOUND, JD_SERVICE_INDEX_CRC_ACK, ACK_MIN_DELAY, ACK_MAX_DELAY, ControlReg, USB_TRANSPORT, PACKETIO_TRANSPORT, META_ACK_FAILED, ControlAnnounceFlags, IDENTIFY_DURATION, PACKET_ANNOUNCE, BLUETOOTH_TRANSPORT
} from "./constants"
import { read32, SMap, bufferEq, assert, setAckError, delay } from "./utils"
import { getNumber, NumberFormat } from "./buffer";
import { JDBus } from "./bus";
import { JDService } from "./service";
import { serviceClass, shortDeviceId } from "./pretty";
import { JDNode } from "./node";
import { isInstanceOf } from "./spec";
import { FirmwareInfo } from "./flashing";
import { JDEventSource } from "./eventsource";

export interface PipeInfo {
    pipeType?: string;
    localPipe?: any;
}

interface AckAwaiter {
    pkt: Packet
    retriesLeft: number
    okCb: () => void
    errCb: () => void
}

export class QualityOfService extends JDEventSource {
    private _receivedPackets = 0;
    private readonly _data: { received: number; total: number }[] =
        Array(10).fill(0).map(_ => ({ received: 0, total: 0, }));
    private _dataIndex = 0;

    constructor() {
        super();
    }

    /**
     * Average packet dropped per announce period
     */
    get dropped(): number {
        const r = this._data
            .filter(e => !!e.total) // ignore total 0
            .reduce((s, e) => s + (e.total - e.received), 0) / this._data.length || 0;
        return r;
    }

    processAnnouncement(pkt: Packet) {
        // collect metrics
        const received = this._receivedPackets;
        const total = pkt.data[2];

        this._data[this._dataIndex] = { received, total }
        this._dataIndex = (this._dataIndex + 1) % this._data.length;

        // reset counter
        this._receivedPackets = 0;
        this.emit(CHANGE);
    }

    processPacket() {
        this._receivedPackets++;
    }
}

export class JDDevice extends JDNode {
    connected: boolean;
    private _source: string;
    private _replay: boolean;
    private _lost: boolean;
    private _servicesData: Uint8Array
    lastSeen: number
    lastServiceUpdate: number
    private _shortId: string
    private _services: JDService[]
    private _ports: SMap<PipeInfo>;
    private _firmwareInfo: FirmwareInfo;
    private _ackAwaiting: AckAwaiter[];
    private _flashing = false;
    private _identifying: boolean;
    private _eventCounter: number;
    readonly qos = new QualityOfService();

    constructor(public readonly bus: JDBus, public readonly deviceId: string) {
        super();
        this.connected = true;
        this._lost = false;
        this._identifying = false;
    }

    get id() {
        return `${this.nodeKind}:${this.deviceId}`
    }

    get name() {
        return this.shortId;
    }

    get nodeKind() {
        return DEVICE_NODE_NAME
    }

    /**
     * Indicates if the devices is a physical device, not emulated.
     */
    get physical() {
        return this._source === USB_TRANSPORT || this._source === BLUETOOTH_TRANSPORT || this._source === PACKETIO_TRANSPORT;
    }

    /**
     * Indicates the source of packets
     */
    get source() {
        return this._source;
    }

    /**
     * Indicates if the device is part of a trace replay
     */
    get replay() {
        return this._replay;
    }

    get friendlyName() {
        return this.shortId;
    }

    get qualifiedName() {
        return this.shortId;
    }

    get announced(): boolean {
        return !!this._servicesData?.length;
    }

    get restartCounter(): number {
        return this._servicesData?.[0] || 0;
    }

    get announceFlags(): ControlAnnounceFlags {
        return this._servicesData?.[1] || 0;
    }

    get packetCount(): number {
        return this._servicesData?.[2] || 0;
    }

    get shortId() {
        // TODO measure if caching is worth it
        if (!this._shortId)
            this._shortId = shortDeviceId(this.deviceId)
        return this._shortId;
    }

    get parent(): JDNode {
        return this.bus
    }

    get firmwareInfo() {
        return this._firmwareInfo;
    }

    set firmwareInfo(info: FirmwareInfo) {
        const changed = JSON.stringify(this._firmwareInfo) !== JSON.stringify(info);
        if (changed) {
            this._firmwareInfo = info;
            this.bus.emit(DEVICE_FIRMWARE_INFO, this)
            this.emit(FIRMWARE_INFO)
            this.bus.emit(DEVICE_CHANGE, this)
            this.emit(CHANGE)
        }
    }

    get lost() {
        return this._lost;
    }

    set lost(v: boolean) {
        if (!!v === this.lost) return;

        // something changed
        this._lost = !!v;
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
     */
    get flashing() {
        return this._flashing;
    }

    /**
     * Sets the flashing sequence state
     */
    set flashing(value: boolean) {
        if (value !== this._flashing) {
            this._flashing = value;
            this.emit(CHANGE);
        }
    }

    get eventCounter() {
        return this._eventCounter;
    }

    set eventCounter(v: number) {
        this._eventCounter = v;
    }

    hasService(service_class: number): boolean {
        if (!this.announced) return false;
        if (service_class === 0) return true;

        // skip first 4 bytes
        for (let i = 4; i < this._servicesData.length; i += 4) {
            const sc = getNumber(this._servicesData, NumberFormat.UInt32LE, i);
            if (isInstanceOf(sc, service_class))
                return true
        }
        return false
    }

    port(id: number) {
        if (!this._ports)
            this._ports = {}
        const key = id + ""
        const ex = this._ports[key]
        if (!ex)
            return this._ports[key] = {}
        return ex
    }

    get serviceLength() {
        if (!this.announced) return 0;
        return this._servicesData.length >> 2;
    }

    serviceClassAt(idx: number): number {
        if (idx == 0)
            return 0;

        idx <<= 2
        if (!this.announced || idx + 4 > this._servicesData.length)
            return undefined
        return read32(this._servicesData, idx)
    }

    get serviceClasses(): number[] {
        const r = [];
        const n = this.serviceLength;
        for (let i = 0; i < n; ++i)
            r.push(this.serviceClassAt(i))
        return r;
    }

    private initServices() {
        assert(this.announced)
        if (!this._services) {
            const n = this.serviceLength;
            const s = [];
            for (let i = 0; i < n; ++i)
                s.push(new JDService(this, i));
            this._services = s;
        }
    }

    service(service_number: number): JDService {
        if (!this.announced) return undefined;
        this.initServices();
        service_number = service_number | 0;
        return this._services && this._services[service_number];
    }


    services(options?: { 
        serviceIndex?: number, 
        serviceName?: string, 
        serviceClass?: number, 
        specification?: boolean 
    }): JDService[] {
        if (!this.announced) return [];

        if (options?.serviceIndex >= 0)
            return [this.service(options?.serviceIndex)]

        if (options?.serviceName && options?.serviceClass > -1)
            throw Error("serviceClass and serviceName cannot be used together")
        let sc = serviceClass(options?.serviceName);
        if (sc === undefined || sc < 0) sc = options?.serviceClass;
        if (sc === undefined) sc = -1;

        this.initServices();
        let r = this._services.slice();
        if (sc > -1) r = r.filter(s => s.serviceClass == sc)

        if (options?.specification)
            r = r.filter(s => !!s.specification)

        return r;
    }

    get children(): JDNode[] {
        return this.services();
    }

    sendCtrlCommand(cmd: number, payload: Buffer = null) {
        const pkt = !payload ? Packet.onlyHeader(cmd) : Packet.from(cmd, payload)
        pkt.serviceIndex = JD_SERVICE_INDEX_CTRL
        return pkt.sendCmdAsync(this)
    }

    processAnnouncement(pkt: Packet) {
        this.qos.processAnnouncement(pkt);

        let changed = false;
        const w0 = this._servicesData ? getNumber(this._servicesData, NumberFormat.UInt32LE, 0) : 0
        const w1 = getNumber(pkt.data, NumberFormat.UInt32LE, 0)

        if (w1 && (w1 & JD_ADVERTISEMENT_0_COUNTER_MASK) < (w0 & JD_ADVERTISEMENT_0_COUNTER_MASK)) {
            this.bus.emit(DEVICE_RESTART, this);
            this.emit(RESTART)
            changed = true;
        }

        // compare service data
        const servicesChanged = !bufferEq(pkt.data, this._servicesData, 4);
        this._servicesData = pkt.data;
        this._source = pkt.sender || this._source; // remember who's sending those packets
        this._replay = !!pkt.replay;

        // notify that services got updated
        if (servicesChanged) {
            this.lastServiceUpdate = pkt.timestamp
            this.bus.emit(DEVICE_ANNOUNCE, this);
            this.emit(ANNOUNCE)
            changed = true;
        }

        // notify that we've received an announce packet
        this.emit(PACKET_ANNOUNCE);

        // notify of any changes
        if (changed) {
            this.bus.emit(DEVICE_CHANGE, this);
            this.bus.emit(CHANGE);
        }
    }

    processPacket(pkt: Packet) {
        this.qos.processPacket(pkt);
        this.lost = false
        this.emit(PACKET_RECEIVE, pkt)
        if (pkt.isReport)
            this.emit(PACKET_REPORT, pkt)
        else if (pkt.isEvent)
            this.emit(PACKET_EVENT, pkt)

        const service = this.service(pkt.serviceIndex)
        if (service)
            service.processPacket(pkt);
    }

    disconnect() {
        this.connected = false;
        this.emit(DISCONNECT)
        this.emit(CHANGE)
    }

    async identify() {
        if (this._identifying) return;

        try {
            this._identifying = true;
            this.emit(CHANGE);

            const ctrl = this.service(0);
            await ctrl.sendCmdAsync(ControlCmd.Identify, undefined, false)

            // wait half second
            await delay(IDENTIFY_DURATION);
        }
        finally {
            this._identifying = false;
            this.emit(CHANGE);
        }
    }

    get identifying() {
        return this._identifying;
    }

    reset() {
        return this.service(0)
            ?.sendCmdAsync(ControlCmd.Reset)
    }

    async resolveFirmwareIdentifier(): Promise<number> {
        const fwIdRegister = this.service(0)?.register(ControlReg.FirmwareIdentifier);
        await fwIdRegister?.refresh(true);
        return fwIdRegister?.intValue;
    }

    get firmwareIdentifier(): number {
        const fwIdRegister = this.service(0)?.register(ControlReg.FirmwareIdentifier);
        const v = fwIdRegister?.intValue;
        if (fwIdRegister && v === undefined)
            fwIdRegister?.refresh(true);
        return v;
    }

    private initAcks() {
        if (this._ackAwaiting) return;

        this._ackAwaiting = []
        this.on(PACKET_REPORT, (rep: Packet) => {
            if (rep.serviceIndex != JD_SERVICE_INDEX_CRC_ACK)
                return
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
                        aa.pkt.meta[META_ACK_FAILED] = true;
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
            setTimeout(resend, Math.random() * (ACK_MAX_DELAY - ACK_MIN_DELAY) + ACK_MIN_DELAY)
        }

        // start loop
        setTimeout(resend, 40)
    }

    sendPktWithAck(pkt: Packet) {
        pkt.requiresAck = true
        this.initAcks()
        return new Promise<void>((resolve, reject) => {
            const ack = {
                pkt,
                retriesLeft: 4,
                okCb: resolve,
                errCb: () => {
                    const e = new Error("No ACK for " + pkt.toString());
                    setAckError(e)
                    reject(e);
                }
            }
            this._ackAwaiting.push(ack)
            pkt.sendCmdAsync(this)
        })
    }
}

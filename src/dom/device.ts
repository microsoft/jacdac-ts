import Packet from "./packet"
import {
    JD_SERVICE_NUMBER_CTRL, DEVICE_ANNOUNCE, DEVICE_CHANGE, ANNOUNCE, DISCONNECT, CONNECT,
    JD_ADVERTISEMENT_0_COUNTER_MASK, DEVICE_RESTART, RESTART, CHANGE,
    PACKET_RECEIVE, PACKET_REPORT, CMD_EVENT, PACKET_EVENT, FIRMWARE_INFO, DEVICE_FIRMWARE_INFO, SRV_CTRL, CtrlCmd, DEVICE_NODE_NAME, LOST, DEVICE_LOST, DEVICE_FOUND, FOUND, JD_SERVICE_NUMBER_CRC_ACK, NAME_CHANGE, DEVICE_NAME_CHANGE, ACK_MIN_DELAY, ACK_MAX_DELAY, CtrlReg
} from "./constants"
import { hash, fromHex, idiv, read32, SMap, bufferEq, assert } from "./utils"
import { getNumber, NumberFormat } from "./buffer";
import { JDBus } from "./bus";
import { JDService } from "./service";
import { serviceClass, shortDeviceId } from "./pretty";
import { JDNode } from "./node";
import { isInstanceOf } from "./spec";
import { FirmwareInfo } from "./flashing";

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

export class JDDevice extends JDNode {
    connected: boolean;
    private _name: string;
    private _lost: boolean;
    servicesData: Uint8Array
    lastSeen: number
    lastServiceUpdate: number
    private _shortId: string
    private _services: JDService[]
    private _ports: SMap<PipeInfo>;
    private _firmwareInfo: FirmwareInfo;
    private _ackAwaiting: AckAwaiter[]

    constructor(public readonly bus: JDBus, public readonly deviceId: string) {
        super();
        this.connected = true;
        this._lost = false;
    }

    get id() {
        return `${this.nodeKind}:${this.deviceId}`
    }

    get nodeKind() {
        return DEVICE_NODE_NAME
    }

    get friendlyName() {
        return this._name || this.shortId;
    }

    get name() {
        return this._name;
    }

    set name(value: string) {
        if (value !== this._name) {
            this._name = value;
            this.log('debug', `renamed to ${this._name}`)
            this.emit(NAME_CHANGE)
            this.bus.emit(DEVICE_NAME_CHANGE, this)
            this.emit(CHANGE)
            this.bus.emit(CHANGE)

            // notify role manager of the change
            this.bus.host.deviceNameSettings?.notifyUpdate(this, this._name);
        }
    }

    get qualifiedName() {
        return this.name
    }

    get announced(): boolean {
        return !!this.servicesData && !!this.servicesData.length;
    }

    get shortId() {
        // TODO measure if caching is worth it
        if (!this._shortId)
            this._shortId = shortDeviceId(this.deviceId)
        return this._shortId;
    }

    get firmwareInfo() {
        return this._firmwareInfo;
    }

    get parent(): JDNode {
        return this.bus
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

    hasService(service_class: number): boolean {
        if (!this.announced) return false;
        if (service_class === 0) return true;

        for (let i = 0; i < this.servicesData.length; i += 4) {
            const sc = getNumber(this.servicesData, NumberFormat.UInt32LE, i);
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
        return this.servicesData.length >> 2;
    }

    serviceClassAt(idx: number): number {
        idx <<= 2
        if (!this.announced || idx + 4 > this.servicesData.length)
            return undefined
        if (idx == 0)
            return 0
        return read32(this.servicesData, idx)
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
            let s = [];
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


    services(options?: { serviceNumber?: number, serviceName?: string, serviceClass?: number }): JDService[] {
        if (!this.announced) return [];

        if (options?.serviceNumber >= 0)
            return [this.service(options?.serviceNumber)]

        if (options?.serviceName && options?.serviceClass > -1)
            throw Error("serviceClass and serviceName cannot be used together")
        let sc = serviceClass(options?.serviceName);
        if (sc === undefined || sc < 0) sc = options?.serviceClass;
        if (sc === undefined) sc = -1;

        this.initServices();
        let r = this._services.slice();
        if (sc > -1) r = r.filter(s => s.serviceClass == sc)
        return r;
    }

    sendCtrlCommand(cmd: number, payload: Buffer = null) {
        const pkt = !payload ? Packet.onlyHeader(cmd) : Packet.from(cmd, payload)
        pkt.service_number = JD_SERVICE_NUMBER_CTRL
        return pkt.sendCmdAsync(this)
    }

    processAnnouncement(pkt: Packet) {
        const w0 = this.servicesData ? getNumber(this.servicesData, NumberFormat.UInt32LE, 0) : 0
        const w1 = getNumber(pkt.data, NumberFormat.UInt32LE, 0)

        if (w1 && (w1 & JD_ADVERTISEMENT_0_COUNTER_MASK) < (w0 & JD_ADVERTISEMENT_0_COUNTER_MASK)) {
            this.bus.emit(DEVICE_RESTART, this);
            this.emit(RESTART)
            this.bus.emit(DEVICE_CHANGE, this);
            this.emit(CHANGE)
        }

        if (!bufferEq(pkt.data, this.servicesData)) {
            this.servicesData = pkt.data
            this.lastServiceUpdate = pkt.timestamp
            this.bus.emit(DEVICE_ANNOUNCE, this);
            this.emit(ANNOUNCE)
            this.emit(CHANGE)
            this.bus.emit(DEVICE_CHANGE, this);
            this.bus.emit(CHANGE);
        }
    }

    processPacket(pkt: Packet) {
        this.lost = false
        this.emit(PACKET_RECEIVE, pkt)
        if (pkt.is_report)
            this.emit(PACKET_REPORT, pkt)
        else if (pkt.service_command == CMD_EVENT)
            this.emit(PACKET_EVENT, pkt)

        const service = this.service(pkt.service_number)
        if (service)
            service.processPacket(pkt);
    }

    disconnect() {
        this.connected = false;
        this.emit(DISCONNECT)
        this.emit(CHANGE)
    }

    identify() {
        return this.service(SRV_CTRL)
            ?.sendCmdAsync(CtrlCmd.Identify, true)
    }

    reset() {
        return this.service(SRV_CTRL)
            ?.sendCmdAsync(CtrlCmd.Reset)
    }

    async resolveDeviceClass(): Promise<number> {
        const deviceClassRegister = this.service(0)?.register(CtrlReg.DeviceClass);
        await deviceClassRegister?.refresh(true);
        return deviceClassRegister?.intValue;
    }

    private initAcks() {
        if (this._ackAwaiting) return;

        this._ackAwaiting = []
        this.on(PACKET_REPORT, (rep: Packet) => {
            if (rep.service_number != JD_SERVICE_NUMBER_CRC_ACK)
                return
            let numdone = 0
            for (const aa of this._ackAwaiting) {
                if (aa.pkt && aa.pkt.crc == rep.service_command) {
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
                        aa.pkt = null
                        aa.errCb()
                        numdrop++
                    } else {
                        //console.log(`resend`, this)
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
        pkt.requires_ack = true
        this.initAcks()
        return new Promise<void>((resolve, reject) => {
            const ack = {
                pkt,
                retriesLeft: 4,
                okCb: resolve,
                errCb: () => reject(new Error("No ACK for " + pkt.toString()))
            }
            this._ackAwaiting.push(ack)
            pkt.sendCmdAsync(this)
        })
    }
}

export function isBootloaderRelated(id1: string, id2: string) {
    if (!id1 || !id2)
        return false

    const i0 = fromHex(id1)
    const i1 = fromHex(id2)

    // modern - one bit is flipped
    if (i0[0] == (i1[0] ^ 1) && bufferEq(i0.slice(1), i1.slice(1)))
        return true

    // legacy - 1 was added
    if (!bufferEq(i0.slice(4), i1.slice(4)))
        return false
    const n0 = num0(i0)
    const n1 = num0(i1)
    return (n0 == n1 + 1) || (n1 == n0 + 1)

    function num0(buf: Uint8Array) {
        return (buf[0] | (buf[1] << 8) | (buf[2] << 16) | (buf[3] << 24)) >>> 0
    }
}

export function isBootloaderFlashing(devices: JDDevice[], flashing: (device: JDDevice) => boolean, candidate: JDDevice) {
    return devices.some(other =>
        other != candidate
        && flashing(other)
        && isBootloaderRelated(other.deviceId, candidate.deviceId))
}
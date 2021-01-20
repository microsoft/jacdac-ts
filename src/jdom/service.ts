import { JDDevice } from "./device";
import Packet from "./packet";
import { serviceName } from "./pretty";
import { JDRegister } from "./register";
import { PACKET_RECEIVE, PACKET_SEND, SERVICE_NODE_NAME, REPORT_RECEIVE, SERVICE_CLIENT_ADDED, SERVICE_CLIENT_REMOVED } from "./constants";
import { JDNode } from "./node";
import { serviceSpecificationFromClassIdentifier, isRegister, isReading, isEvent, isSensor, isActuator } from "./spec";
import { JDEvent } from "./event";
import { delay, strcmp } from "./utils";
import { SystemReg } from "../../jacdac-spec/dist/specconstants";
import { JDServiceClient } from "./serviceclient";
import { InPipeReader } from "./pipes";
import { jdunpack } from "./pack";

export class JDService extends JDNode {
    private _registers: JDRegister[];
    private _events: JDEvent[];
    private _reports: Packet[] = [];
    private _specification: jdspec.ServiceSpec = null;
    // packets received since last announce
    public registersUseAcks = false;
    private readonly _clients: JDServiceClient[] = [];

    constructor(
        public readonly device: JDDevice,
        public readonly service_index: number
    ) {
        super()
    }

    get id() {
        return `${this.nodeKind}:${this.device.deviceId}:${this.service_index.toString(16)}`
    }

    get nodeKind() {
        return SERVICE_NODE_NAME
    }

    get serviceClass() {
        return this.device.serviceClassAt(this.service_index);
    }

    get name() {
        return serviceName(this.serviceClass)
    }

    get friendlyName() {
        const parts = [this.device.friendlyName]
        if (this.device.services({ serviceClass: this.serviceClass }).length > 1)
            parts.push(`[${this.service_index.toString(16)}]`)
        return parts.join('.')
    }

    get qualifiedName() {
        return `${this.device.qualifiedName}[${this.service_index.toString(16)}]`
    }

    get parent(): JDNode {
        return this.device
    }

    report(identifier: number) {
        return this._reports.find(r => r.registerIdentifier === identifier);
    }

    get reports() {
        return this._reports.slice(0);
    }

    private _readingRegister: JDRegister;
    get readingRegister(): JDRegister {
        if (!this._readingRegister) {
            const pkt = this.specification?.packets.find(pkt => isReading(pkt))
            this._readingRegister = pkt && this.register(pkt.identifier)
        }
        return this._readingRegister;
    }

    private _statusCodeRegister: JDRegister;
    get statusCodeRegister(): JDRegister {
        if (!this._statusCodeRegister) {
            const pkt = this.specification?.packets.find(pkt => pkt.identifier === SystemReg.StatusCode)
            this._statusCodeRegister = pkt && this.register(pkt.identifier);
        }
        return this._statusCodeRegister;
    }

    /**
     * Gets the specification of the service. Undefined if unknown
     */
    get specification() {
        if (this._specification === null)
            this._specification = serviceSpecificationFromClassIdentifier(this.serviceClass)
        return this._specification;
    }

    get events() {
        return this.specification?.packets.filter(isEvent).map(info => this.event(info.identifier)) || [];
    }

    registers() {
        if (!this._registers) {
            const spec = this.specification;
            this._registers = (spec?.packets || []).filter(isRegister).map(pkt => new JDRegister(this, pkt.identifier));
        }
        return this._registers.slice(0);
    }

    get children(): JDNode[] {
        return [...this.registers(), ... this.events];
    }

    register(registerCode: number): JDRegister {
        if (registerCode === undefined)
            return undefined;
        // cache known registers
        this.registers()
        let register = this._registers.find(reg => reg.code === registerCode);
        // we may not have a spec.
        if (!register) {
            const spec = this.specification;
            if (spec && !spec.packets.some(pkt => isRegister(pkt) && pkt.identifier === registerCode)) {
                //this.log(`debug`, `attempting to access register 0x${identifier.toString(16)}`)
                return undefined;
            }
            this._registers.push(register = new JDRegister(this, registerCode));
        }
        return register;
    }

    event(eventCode: number): JDEvent {
        if (!this._events)
            this._events = [];
        let event = this._events.find(ev => ev.code === eventCode);
        if (!event) {
            const spec = this.specification;
            if (spec && !spec.packets.some(pkt => isEvent(pkt) && pkt.identifier === eventCode)) {
                this.log(`warn`, `attempting to access event 0x${eventCode.toString(16)}`)
                return undefined;
            }
            this._events.push(event = new JDEvent(this, eventCode));
        }
        return event;
    }

    sendPacketAsync(pkt: Packet, ack?: boolean) {
        pkt.device = this.device;
        pkt.serviceIndex = this.service_index;
        if (ack !== undefined)
            pkt.requiresAck = !!ack
        this.emit(PACKET_SEND, pkt)
        if (pkt.requiresAck)
            return this.device.sendPktWithAck(pkt)
        else
            return pkt.sendCmdAsync(this.device);
    }

    sendCmdAsync(cmd: number, data?: Uint8Array, ack?: boolean) {
        const pkt = data ? Packet.from(cmd, data) : Packet.onlyHeader(cmd);
        return this.sendPacketAsync(pkt, ack)
    }

    sendCmdAwaitResponseAsync(pkt: Packet, timeout = 500) {
        return new Promise<Packet>((resolve, reject) => {
            const handleRes = (resp: Packet) => {
                if (resp.serviceCommand == pkt.serviceCommand) {
                    this.off(REPORT_RECEIVE, handleRes)
                    if (resolve)
                        resolve(resp)
                    resolve = null
                }
            }
            delay(timeout).then(() => {
                if (!resolve) return
                resolve = null
                this.off(REPORT_RECEIVE, handleRes)
                reject(new Error(`timeout (${timeout}ms) waiting for response to ${pkt}`))
            })
            this.sendPacketAsync(pkt)
                .then(() => {
                    this.on(REPORT_RECEIVE, handleRes)
                })
            // the handler remove either upon timeout, 
            // or on first invocation of handleRes()
        })
    }

    processPacket(pkt: Packet) {
        this.emit(PACKET_RECEIVE, pkt)
        if (pkt.isReport) {
            this.emit(REPORT_RECEIVE, pkt)
            if (pkt.isRegisterGet) {
                const id = pkt.registerIdentifier;
                const reg = this.register(id)
                if (reg)
                    reg.processReport(pkt);
            } else if (pkt.isEvent) {
                const id = pkt.intData
                const ev = this.event(id)
                if (ev)
                    ev.processEvent(pkt);
            } else if (pkt.isCommand) {
                // this is a report...
            }
        }
    }

    compareTo(b: JDService): number {
        const a = this;
        return a.serviceClass - b.serviceClass ||
            strcmp(a.device.deviceId, b.device.deviceId) ||
            a.service_index - b.service_index;
    }

    get clients(): JDServiceClient[] {
        return this._clients?.slice(0) || [];
    }

    addClient(client: JDServiceClient) {
        if (client && this._clients.indexOf(client) < 0) {
            this._clients.push(client);
            this.emit(SERVICE_CLIENT_ADDED, client);
        }
    }

    removeClient(client: JDServiceClient) {
        const i = this._clients.indexOf(client);
        if (i > -1) {
            this._clients.splice(i, 1);
            this.emit(SERVICE_CLIENT_REMOVED, client);
        }
    }

    async receiveWithInPipe<TValues extends any[]>(cmd: number, packFormat: string) {
        const inp = new InPipeReader(this.device.bus)
        await this.sendPacketAsync(
            inp.openCommand(cmd),
            true)
        const recv: TValues[] = [];
        for (const buf of await inp.readData()) {
            const values = jdunpack<TValues>(buf, packFormat);
            recv.push(values);
        }
        return recv;
    }
}

export function stableSortServices(services: JDService[]): JDService[] {
    return services?.sort((a, b) => a.compareTo(b))
}
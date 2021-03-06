import { JDDevice } from "./device"
import Packet from "./packet"
import { serviceName } from "./pretty"
import { JDRegister } from "./register"
import {
    PACKET_RECEIVE,
    PACKET_SEND,
    SERVICE_NODE_NAME,
    REPORT_RECEIVE,
    SERVICE_CLIENT_ADDED,
    SERVICE_CLIENT_REMOVED,
    CHANGE,
    ROLE_CHANGE,
} from "./constants"
import { JDNode } from "./node"
import {
    serviceSpecificationFromClassIdentifier,
    isRegister,
    isReading,
    isEvent,
    isValue,
    isIntensity,
    isOptionalReadingRegisterCode,
    isConstRegister,
} from "./spec"
import { JDEvent } from "./event"
import { strcmp } from "./utils"
import {
    BaseEvent,
    BaseReg,
    SystemEvent,
    SystemReg,
} from "../../jacdac-spec/dist/specconstants"
import { JDServiceClient } from "./serviceclient"
import { InPipeReader } from "./pipes"
import { jdunpack, PackedValues } from "./pack"
import Flags from "./flags"
import { isMixinService } from "../../jacdac-spec/spectool/jdutils"
import JDServiceServer from "./serviceserver"

export class JDService extends JDNode {
    private _role: string
    private _registers: JDRegister[]
    private _events: JDEvent[]
    private _reports: Packet[] = []
    private _specification: jdspec.ServiceSpec = null
    // packets received since last announce
    public registersUseAcks = false
    private readonly _clients: JDServiceClient[] = []

    private _twin: JDServiceServer

    constructor(
        public readonly device: JDDevice,
        public readonly serviceIndex: number
    ) {
        super()

        const statusCodeChanged = this.event(BaseEvent.StatusCodeChanged)
        statusCodeChanged.on(CHANGE, () => {
            // todo update status code with event payload
            const { data } = statusCodeChanged
            console.log("status code changed", { data })
            // request data
            const statusCode = this.register(BaseReg.StatusCode)
            statusCode?.sendGetAsync()
        })
    }

    get id() {
        return `${this.nodeKind}:${
            this.device.deviceId
        }:${this.serviceIndex.toString(16)}`
    }

    get nodeKind() {
        return SERVICE_NODE_NAME
    }

    get serviceClass() {
        return this.device.serviceClassAt(this.serviceIndex)
    }

    get name() {
        return serviceName(this.serviceClass)?.toLowerCase()
    }

    get friendlyName() {
        const parts = [this.device.friendlyName]
        if (
            this.device.services({ serviceClass: this.serviceClass }).length > 1
        )
            parts.push(`[${this.serviceIndex.toString(16)}]`)
        return parts.join(".")
    }

    get qualifiedName() {
        return `${this.device.qualifiedName}[${this.serviceIndex.toString(16)}]`
    }

    get parent(): JDNode {
        return this.device
    }

    get role(): string {
        return this._role
    }

    set role(value: string) {
        if (value !== this._role) {
            this._role = value
            this.emit(ROLE_CHANGE)
            this.emit(CHANGE)
        }
    }

    report(identifier: number) {
        return this._reports.find(r => r.registerIdentifier === identifier)
    }

    get reports() {
        return this._reports.slice(0)
    }

    get mixins() {
        // find all 0x2 services follow this service
        const r = []
        const { serviceClasses, serviceLength } = this.device
        for (
            let i = this.serviceIndex + 1;
            i < serviceLength && isMixinService(serviceClasses[i]);
            ++i
        ) {
            r.push(this.device.service(i))
        }
        return r
    }

    get isMixin() {
        return isMixinService(this.serviceClass)
    }

    get twin(): JDServiceServer {
        return this._twin
    }

    set twin(server: JDServiceServer) {
        if (this._twin === server) return

        if (this._twin) this._twin.twin = undefined
        this._twin = server
        server.twin = this
        this.emit(CHANGE)
    }

    private _readingRegister: JDRegister
    get readingRegister(): JDRegister {
        if (!this._readingRegister) {
            const pkt = this.specification?.packets.find(pkt => isReading(pkt))
            this._readingRegister = pkt && this.register(pkt.identifier)
        }
        return this._readingRegister
    }

    private _valueRegister: JDRegister
    get valueRegister(): JDRegister {
        if (!this._valueRegister) {
            const pkt = this.specification?.packets.find(pkt => isValue(pkt))
            this._valueRegister = pkt && this.register(pkt.identifier)
        }
        return this._valueRegister
    }

    private _intensityRegister: JDRegister
    get intensityRegister(): JDRegister {
        if (!this._intensityRegister) {
            const pkt = this.specification?.packets.find(pkt =>
                isIntensity(pkt)
            )
            this._intensityRegister = pkt && this.register(pkt.identifier)
        }
        return this._intensityRegister
    }

    private _statusCodeRegister: JDRegister
    get statusCodeRegister(): JDRegister {
        if (!this._statusCodeRegister) {
            const pkt = this.specification?.packets.find(
                pkt => pkt.identifier === SystemReg.StatusCode
            )
            this._statusCodeRegister = pkt && this.register(pkt.identifier)
        }
        return this._statusCodeRegister
    }

    get instanceName() {
        const r = this.register(SystemReg.InstanceName)
        return r?.stringValue
    }

    /**
     * Gets the specification of the service. Undefined if unknown
     */
    get specification() {
        if (this._specification === null)
            this._specification = serviceSpecificationFromClassIdentifier(
                this.serviceClass
            )
        return this._specification
    }

    get events() {
        return (
            this.specification?.packets
                .filter(isEvent)
                .map(info => this.event(info.identifier)) || []
        )
    }

    registers() {
        if (!this._registers) {
            const spec = this.specification
            this._registers = (spec?.packets || [])
                .filter(isRegister)
                .map(pkt => new JDRegister(this, pkt.identifier))
        }
        return this._registers.slice(0)
    }

    get children(): JDNode[] {
        return [...this.registers(), ...this.events]
    }

    register(registerCode: number): JDRegister {
        if (registerCode === undefined) return undefined
        // cache known registers
        this.registers()
        let register = this._registers.find(reg => reg.code === registerCode)
        // we may not have a spec.
        if (!register) {
            const spec = this.specification
            if (
                spec &&
                !spec.packets.some(
                    pkt => isRegister(pkt) && pkt.identifier === registerCode
                )
            ) {
                if (
                    Flags.diagnostics &&
                    !isOptionalReadingRegisterCode(registerCode)
                )
                    console.debug(
                        `attempting to access register ${
                            SystemReg[registerCode] ||
                            `0x${registerCode.toString(16)}`
                        }`
                    )
                return undefined
            }
            this._registers.push(
                (register = new JDRegister(this, registerCode))
            )
        }
        return register
    }

    event(eventCode: number): JDEvent {
        if (!this._events) this._events = []
        let event = this._events.find(ev => ev.code === eventCode)
        if (!event) {
            const spec = this.specification
            if (
                spec &&
                !spec.packets.some(
                    pkt => isEvent(pkt) && pkt.identifier === eventCode
                )
            ) {
                if (Flags.diagnostics)
                    console.debug(
                        `attempting to access event ${
                            SystemEvent[eventCode] ||
                            `0x${eventCode.toString(16)}`
                        }`
                    )
                return undefined
            }
            this._events.push((event = new JDEvent(this, eventCode)))
        }
        return event
    }

    async sendPacketAsync(pkt: Packet, ack?: boolean) {
        pkt.device = this.device
        pkt.serviceIndex = this.serviceIndex
        if (ack !== undefined) pkt.requiresAck = !!ack
        if (pkt.requiresAck) await this.device.sendPktWithAck(pkt)
        else await pkt.sendCmdAsync(this.device)
        this.emit(PACKET_SEND, pkt)

        // invalid register after a command call to refresh their values asap
        if (pkt.isCommand && !pkt.isRegisterGet && !pkt.isRegisterSet)
            this.invalidateRegisterValues(pkt)
    }

    sendCmdAsync(cmd: number, data?: Uint8Array, ack?: boolean) {
        const pkt = data ? Packet.from(cmd, data) : Packet.onlyHeader(cmd)
        return this.sendPacketAsync(pkt, ack)
    }

    sendCmdAwaitResponseAsync(pkt: Packet, timeout = 500) {
        const { bus } = this.device
        return new Promise<Packet>((resolve, reject) => {
            const handleRes = (resp: Packet) => {
                if (resp.serviceCommand == pkt.serviceCommand) {
                    this.off(REPORT_RECEIVE, handleRes)
                    if (resolve) resolve(resp)
                    resolve = null
                }
            }
            bus.delay(timeout).then(() => {
                if (!resolve) return
                resolve = null
                this.off(REPORT_RECEIVE, handleRes)
                reject(
                    new Error(
                        `timeout (${timeout}ms) waiting for response to ${pkt}`
                    )
                )
            })
            this.sendPacketAsync(pkt).then(() => {
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
                const id = pkt.registerIdentifier
                const reg = this.register(id)
                if (reg) reg.processPacket(pkt)
            } else if (pkt.isEvent) {
                const ev = this.event(pkt.eventCode)
                if (ev) ev.processEvent(pkt)
            } else if (pkt.isCommand) {
                // this is a report...
                console.log("cmd report", { pkt })
            }
        } else if (pkt.isRegisterSet) {
            const id = pkt.registerIdentifier
            const reg = this.register(id)
            if (reg) reg.processPacket(pkt)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private invalidateRegisterValues(pkt: Packet) {
        //console.log(`clearing register get timestamp`, pkt)
        this.registers()
            .filter(r => r.specification && !isConstRegister(r.specification))
            .forEach(r => r.clearGetTimestamp())
    }

    compareTo(b: JDService): number {
        return (
            this.serviceClass - b.serviceClass ||
            strcmp(this.device.deviceId, b.device.deviceId) ||
            this.serviceIndex - b.serviceIndex
        )
    }

    get clients(): JDServiceClient[] {
        return this._clients?.slice(0) || []
    }

    addClient(client: JDServiceClient) {
        if (client && this._clients.indexOf(client) < 0) {
            this._clients.push(client)
            this.emit(SERVICE_CLIENT_ADDED, client)
        }
    }

    removeClient(client: JDServiceClient) {
        const i = this._clients.indexOf(client)
        if (i > -1) {
            this._clients.splice(i, 1)
            this.emit(SERVICE_CLIENT_REMOVED, client)
        }
    }

    async receiveWithInPipe<TValues extends PackedValues>(
        cmd: number,
        packFormat: string,
        timeout?: number
    ) {
        const inp = new InPipeReader(this.device.bus)
        await this.sendPacketAsync(inp.openCommand(cmd), true)
        const recv: TValues[] = []
        for (const buf of await inp.readData(timeout)) {
            const values = jdunpack<TValues>(buf, packFormat)
            recv.push(values)
        }
        return recv
    }
}

export function stableSortServices(services: JDService[]): JDService[] {
    return services?.sort((a, b) => a.compareTo(b))
}

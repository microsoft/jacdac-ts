import { JDDevice } from "./device"
import { Packet } from "./packet"
import { serviceShortIdOrClass } from "./pretty"
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
    CMD_REG_MASK,
    CMD_GET_REG,
    CMD_SET_REG,
    COMMAND_RECEIVE,
    ERROR_TIMEOUT,
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
} from "./spec"
import { JDEvent } from "./event"
import { strcmp } from "./utils"
import {
    BaseEvent,
    BaseReg,
    SystemCmd,
    SystemEvent,
    SystemReg,
} from "../../jacdac-spec/dist/specconstants"
import { JDServiceClient } from "./serviceclient"
import { InPipeReader } from "./pipes"
import { jdpack, jdunpack, PackedValues } from "./pack"
import { Flags } from "./flags"
import { isMixinService } from "../../jacdac-spec/spectool/jdutils"
import { JDServiceServer } from "./servers/serviceserver"
import { JDError } from "./error"

/**
 * A Jacdac service client hosting registers, events.
 * @category JDOM
 */
export class JDService extends JDNode {
    /**
     * Gets the service class
     * @category Control
     */
    readonly serviceClass: number
    private _role: string
    private _registers: JDRegister[]
    private _events: JDEvent[]
    private _reports: Packet[] = []
    private _specification: jdspec.ServiceSpec = null
    // packets received since last announce
    public registersUseAcks = false
    private readonly _clients: JDServiceClient[] = []

    private _twin: JDServiceServer

    /**
     * Gets the device this service belongs to
     * @category JDOM
     */
    public readonly device: JDDevice
    /**
     * Gets the service index in the service list
     * @category Control
     */
    public readonly serviceIndex: number

    /**
     * @internal
     */
    constructor(device: JDDevice, serviceIndex: number) {
        super()
        this.device = device
        this.serviceIndex = serviceIndex
        this.serviceClass = this.device.serviceClassAt(this.serviceIndex)

        const statusCodeChanged = this.event(BaseEvent.StatusCodeChanged)
        statusCodeChanged.on(CHANGE, () => {
            const statusCode = this.register(BaseReg.StatusCode)
            statusCode?.scheduleRefresh()
        })
    }

    get disposed() {
        return this.device.service(this.serviceIndex) !== this
    }

    /**
     * Gets the node identifier
     * @category JDOM
     */
    get id() {
        return `${this.nodeKind}:${
            this.device.deviceId
        }:${this.serviceIndex.toString(16)}`
    }

    /**
     * Gets the ``SERVICE_NODE_NAME`` identifier
     * @category JDOM
     */
    get nodeKind() {
        return SERVICE_NODE_NAME
    }

    /**
     * Gets the service name
     * @category JDOM
     */
    get name() {
        return serviceShortIdOrClass(this.serviceClass, "x").toLowerCase()
    }

    /**
     * Gets the service name and parent names and service instance index
     * @category JDOM
     */
    get friendlyName() {
        const { instanceName, serviceInstanceIndex } = this
        let r = `${this.device.friendlyName}.${this.name}`
        if (instanceName) r += `.${instanceName}`
        else if (serviceInstanceIndex > 0) r += `[${serviceInstanceIndex}]`
        return r
    }

    /**
     * Gets the service qualified name and service instance index
     * @category JDOM
     */
    get qualifiedName() {
        return `${this.device.qualifiedName}.${this.name}[${this.serviceInstanceIndex}]`
    }

    /**
     * Gets the index of this service class instance. Provides a stable ordering into a list of services.
     */
    get serviceInstanceIndex() {
        return this.device
            .services({ serviceClass: this.serviceClass })
            .indexOf(this)
    }

    /**
     * Gets the device holding the service
     * @category JDOM
     */
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
    /**
     * Gets the ``reading`` register associated to this service, if the specification supports it.
     * @category Registers
     */
    get readingRegister(): JDRegister {
        if (!this._readingRegister) {
            const pkt = this.specification?.packets.find(pkt => isReading(pkt))
            this._readingRegister = pkt && this.register(pkt.identifier)
        }
        return this._readingRegister
    }

    private _valueRegister: JDRegister
    /**
     * Gets the ``value`` register associated to this service, if the specification supports it.
     * @category Registers
     */
    get valueRegister(): JDRegister {
        if (!this._valueRegister) {
            const pkt = this.specification?.packets.find(pkt => isValue(pkt))
            this._valueRegister = pkt && this.register(pkt.identifier)
        }
        return this._valueRegister
    }

    private _intensityRegister: JDRegister
    /**
     * Gets the ``intensity`` register associated to this service, if the specification supports it.
     * @category Registers
     */
    get intensityRegister(): JDRegister {
        if (!this._intensityRegister) {
            const pkt = this.specification?.packets.find(pkt =>
                isIntensity(pkt),
            )
            this._intensityRegister = pkt && this.register(pkt.identifier)
        }
        return this._intensityRegister
    }

    /**
     * Gets the service instance name, if resolved
     * @category Control
     */
    get instanceName() {
        const r = this.register(SystemReg.InstanceName)
        return r?.stringValue
    }

    /**
     * Resolves the service instance name, if resolved
     * @category Control
     */
    async resolveInstanceName() {
        const r = this.register(SystemReg.InstanceName)
        await r?.refresh()
        return r?.stringValue
    }

    /**
     * Gets the specification of the service. Undefined if unknown
     * @category Services
     */
    get specification() {
        if (this._specification === null)
            this._specification = serviceSpecificationFromClassIdentifier(
                this.serviceClass,
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

    /**
     * Gets the list of registers in the service
     * @param options
     * @returns
     */
    registers(options?: { ignoreNacks?: boolean }) {
        if (!this._registers) {
            const spec = this.specification
            this._registers = (spec?.packets || [])
                .filter(isRegister)
                .map(pkt => new JDRegister(this, pkt.identifier))
        }

        let regs = this._registers.slice(0)
        if (options?.ignoreNacks) regs = regs.filter(r => !r.notImplemented)
        return regs
    }

    /**
     * Gets the registers and events
     * @category JDOM
     */
    get children(): JDNode[] {
        return [...this.registers(), ...this.events]
    }

    /**
     * Gets a register for the given code
     * @param registerCode register identifier as found in the specification
     * @returns a register instance (if found in specifiaction)
     * @category Registers
     */
    register(registerCode: number): JDRegister {
        if (isNaN(registerCode)) return undefined
        // cache known registers
        this.registers()
        let register = this._registers.find(reg => reg.code === registerCode)
        // we may not have a spec.
        if (!register) {
            const spec = this.specification
            if (
                spec &&
                !spec.packets.some(
                    pkt => isRegister(pkt) && pkt.identifier === registerCode,
                )
            ) {
                if (
                    Flags.diagnostics &&
                    !isOptionalReadingRegisterCode(registerCode)
                )
                    console.debug(
                        `attempting to access register ${this}.${
                            SystemReg[registerCode] ||
                            `0x${registerCode.toString(16)}`
                        }`,
                    )
                return undefined
            }
            this._registers.push(
                (register = new JDRegister(this, registerCode)),
            )
        }
        return register
    }

    /**
     * Gets an event for the given code
     * @param eventCode event identifier as found in the specification
     * @returns a event instance (if found in specifiaction)
     * @category Events
     */
    event(eventCode: number): JDEvent {
        if (isNaN(eventCode)) return undefined

        if (!this._events) this._events = []
        let event = this._events.find(ev => ev.code === eventCode)
        if (!event) {
            const spec = this.specification
            if (
                spec &&
                !spec.packets.some(
                    pkt => isEvent(pkt) && pkt.identifier === eventCode,
                )
            ) {
                if (Flags.diagnostics)
                    console.debug(
                        `attempting to access event ${
                            SystemEvent[eventCode] ||
                            `0x${eventCode.toString(16)}`
                        }`,
                    )
                return undefined
            }
            this._events.push((event = new JDEvent(this, eventCode)))
        }
        return event
    }

    /**
     * Send packet to the service server
     * @param pkt packet to send
     * @param ack acknolegment required
     * @category Packets
     */
    async sendPacketAsync(pkt: Packet, ack?: boolean) {
        pkt.device = this.device
        pkt.serviceIndex = this.serviceIndex
        if (ack !== undefined) pkt.requiresAck = !!ack
        if (pkt.requiresAck) await this.device.sendPktWithAck(pkt)
        else await pkt.sendCmdAsync(this.device)
        this.emit(PACKET_SEND, pkt)
    }

    /**
     * Send a command to the service server
     * @param pkt packet to send
     * @param ack acknolegment required
     * @category Packets
     */
    sendCmdAsync(cmd: number, data?: Uint8Array, ack?: boolean) {
        const pkt = data ? Packet.from(cmd, data) : Packet.onlyHeader(cmd)
        return this.sendPacketAsync(pkt, ack)
    }

    /**
     * Packs values and sends command to the service server
     * @param cmd packet to send
     * @param values unpacked values, layed as specified
     * @param ack acknolegment required
     * @category Packets
     */
    sendCmdPackedAsync<TValues extends PackedValues>(
        cmd: number,
        values?: TValues,
        ack?: boolean,
    ) {
        const spec = this.specification.packets.find(
            pkt => pkt.kind === "command" && pkt.identifier === cmd,
        )
        const packFormat = spec?.packFormat
        if (!packFormat) throw new Error("Unknown packing format")
        const data = values ? jdpack(packFormat, values) : undefined
        return this.sendCmdAsync(cmd, data, ack)
    }

    /**
     * Send a command and await response to the service server
     * @param pkt packet to send
     * @param ack acknolegment required
     * @category Packets
     */
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
                    new JDError(
                        `timeout (${timeout}ms) waiting for response to ${pkt}`,
                        { code: ERROR_TIMEOUT },
                    ),
                )
            })

            // the handler removed either upon timeout,
            // or on first invocation of handleRes()
            this.on(REPORT_RECEIVE, handleRes)

            // need to add handler first, in case this doesn't return before packet is sent and response is received
            this.sendPacketAsync(pkt)
        })
    }

    /**
     * @internal
     */
    processPacket(pkt: Packet) {
        this.emit(PACKET_RECEIVE, pkt)
        if (pkt.isRepeatedEvent) return
        if (pkt.isReport) {
            this.emit(REPORT_RECEIVE, pkt)
            if (pkt.isRegisterGet) {
                const id = pkt.registerIdentifier
                const reg = this.register(id)
                if (reg) reg.processPacket(pkt)
            } else if (pkt.isEvent) {
                const ev = this.event(pkt.eventCode)
                if (ev) ev.processEvent(pkt)
            } else if (pkt.serviceCommand === SystemCmd.CommandNotImplemented) {
                const [serviceCommand, packetCrc] =
                    pkt.jdunpack<[number, number]>("u16 u16")
                if (
                    serviceCommand >> 12 === CMD_GET_REG >> 12 ||
                    serviceCommand >> 12 === CMD_SET_REG >> 12
                ) {
                    const regCode = serviceCommand & CMD_REG_MASK
                    const reg = this.registers().find(r => r.code === regCode)
                    reg?.setNotImplemented()
                }
            } else if (pkt.isCommand) {
                // this is a report...
                //console.log("cmd report", { pkt })
            }
        } else if (pkt.isRegisterSet) {
            const id = pkt.registerIdentifier
            const reg = this.register(id)
            if (reg) reg.processPacket(pkt)
        } else if (pkt.isCommand) {
            this.emit(COMMAND_RECEIVE, pkt)
        }
    }

    /**
     * @internal
     */
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
        timeout?: number,
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

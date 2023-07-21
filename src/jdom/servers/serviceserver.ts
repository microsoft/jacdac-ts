import {
    BaseEvent,
    SystemCmd,
    SystemEvent,
    SystemReg,
    SystemStatusCodes,
} from "../../../jacdac-spec/dist/specconstants"
import {
    CHANGE,
    DEVICE_CHANGE,
    FRAME_PROCESS_LARGE,
    PACKET_RECEIVE,
    PACKET_SEND,
    REPORT_UPDATE,
} from "../constants"
import { JDServerServiceProvider } from "./serverserviceprovider"
import { JDEventSource } from "../eventsource"
import { Packet } from "../packet"
import { JDRegisterServer } from "./registerserver"
import { isRegister, serviceSpecificationFromClassIdentifier } from "../spec"
import { PackedValues } from "../pack"
import { JDService } from "../service"

const CALIBRATION_DELAY = 5000

/**
 * Server instiation options
 * @category Servers
 */
export interface JDServerOptions {
    /**
     * Service instance name
     */
    instanceName?: string
    /**
     * This server instance is a twin of a physical device and should not emit any packet
     */
    twin?: JDService
    /**
     * Initial value for the ``value`` register
     */
    valueValues?: PackedValues
    /**
     * Initial value for the ``intensity`` register
     */
    intensityValues?: PackedValues

    /**
     * A callback to transform the received intensity value data
     */
    intensityProcessor?: (values: PackedValues) => PackedValues

    /**
     * Emit active/inactive events based on the intensity register
     */
    isActive?: (intensity: PackedValues) => boolean
    /**
     * Initial value for the ``variant`` register
     */
    variant?: number
    /**
     * Optional client variant register
     */
    clientVariant?: string
    /**
     * A map of custom register initial values
     */
    registerValues?: {
        code: number
        values: PackedValues
    }[]
}

/**
 * Base class for service server implementations
 * @category Servers
 */
export class JDServiceServer extends JDEventSource {
    public serviceIndex = -1 // set by device
    private _device: JDServerServiceProvider
    public readonly specification: jdspec.ServiceSpec
    private readonly _registers: JDRegisterServer<PackedValues>[] = []
    private readonly commands: {
        [identifier: number]: (pkt: Packet) => void
    } = {}
    readonly statusCode: JDRegisterServer<[SystemStatusCodes, number]>
    readonly instanceName: JDRegisterServer<[string]>
    private _twin: JDService
    private _twinCleanup: (() => void)[]
    private _locked = false

    constructor(
        public readonly serviceClass: number,
        options?: JDServerOptions,
    ) {
        super()
        const {
            instanceName,
            variant,
            valueValues,
            intensityValues,
            intensityProcessor,
            registerValues,
            clientVariant,
            isActive,
        } = options || {}

        this.specification = serviceSpecificationFromClassIdentifier(
            this.serviceClass,
        )

        this.statusCode = this.addRegister<[SystemStatusCodes, number]>(
            SystemReg.StatusCode,
            [SystemStatusCodes.Ready, 0],
        )
        if (valueValues) this.addRegister(SystemReg.Value, valueValues)
        if (intensityValues) {
            const intensity = this.addRegister(
                SystemReg.Intensity,
                intensityValues,
            )
            if (intensityProcessor)
                intensity.valueProcessor = intensityProcessor
            if (isActive)
                intensity.on(CHANGE, () => {
                    const ev = isActive(intensity.values())
                    if (ev !== undefined)
                        this.sendEvent(
                            isActive(intensity.values())
                                ? SystemEvent.Active
                                : SystemEvent.Inactive,
                        )
                })
        }
        if (variant) this.addRegister<[number]>(SystemReg.Variant, [variant])
        if (clientVariant)
            this.addRegister<[string]>(SystemReg.ClientVariant, [clientVariant])
        this.instanceName = this.addRegister<[string]>(SystemReg.InstanceName, [
            instanceName || "",
        ])

        // any extra
        registerValues?.forEach(({ code, values }) =>
            this.addRegister<PackedValues>(code, values),
        )

        // emit event when status code changes
        this.statusCode.on(CHANGE, () =>
            this.sendEvent(BaseEvent.StatusCodeChanged, this.statusCode.data),
        )

        // if the device has a calibrate command, regiser handler
        // and put device in calibrationneeded state
        if (
            this.specification.packets.find(
                pkt =>
                    pkt.kind === "command" &&
                    pkt.identifier === SystemCmd.Calibrate,
            )
        ) {
            this.addCommand(
                SystemCmd.Calibrate,
                this.handleCalibrate.bind(this),
            )
            this.statusCode.setValues(
                [SystemStatusCodes.CalibrationNeeded, 0],
                true,
            )
        }

        this.handleTwinPacket = this.handleTwinPacket.bind(this)
    }

    get device() {
        return this._device
    }

    set device(value: JDServerServiceProvider) {
        if (this._device !== value) {
            this._device = value
            this.emit(DEVICE_CHANGE)
            this.emit(CHANGE)
        }
    }

    get twin() {
        return this._twin
    }

    set twin(service: JDService) {
        if (service === this._twin) return

        if (this._twin) {
            this._twin.off(PACKET_RECEIVE, this.handleTwinPacket)
            this._twin.off(PACKET_SEND, this.handleTwinPacket)
            this._twinCleanup.forEach(tw => tw())
            // unsubscribe
        }
        this._twin = service
        this._twinCleanup = service ? [] : undefined
        if (this._twin) {
            this._twin.on(PACKET_RECEIVE, this.handleTwinPacket)
            this._twin.on(PACKET_SEND, this.handleTwinPacket)
            this._twin.registers().forEach(twinReg => {
                const reg = this.register(twinReg.code)
                if (reg) {
                    reg?.setValues(twinReg.unpackedValue)
                    this._twinCleanup.push(
                        twinReg.subscribe(REPORT_UPDATE, () =>
                            reg.setValues(twinReg.unpackedValue),
                        ),
                    )
                }
            })
        }

        this.emit(CHANGE)
    }

    private handleTwinPacket(pkt: Packet) {
        this.handlePacket(pkt)
    }

    get registers() {
        return this._registers.slice(0)
    }

    get timestamp() {
        const bus = this.device?.bus || this._twin?.device?.bus
        return bus?.timestamp
    }

    register<TValues extends PackedValues = PackedValues>(
        code: number,
    ): JDRegisterServer<TValues> {
        return this._registers.find(
            reg => reg.identifier === code,
        ) as JDRegisterServer<TValues>
    }

    protected addExistingRegister<TValues extends PackedValues = PackedValues>(
        reg: JDRegisterServer<TValues>,
    ) {
        this._registers.push(reg)
        return reg
    }

    addRegister<TValues extends PackedValues = PackedValues>(
        identifier: number,
        defaultValue?: TValues,
    ): JDRegisterServer<TValues> {
        let reg = this._registers.find(
            r => r.identifier === identifier,
        ) as JDRegisterServer<TValues>
        if (!reg && !this._locked) {
            // make sure this register is supported
            if (
                !this.specification.packets.find(
                    pkt => isRegister(pkt) && pkt.identifier === identifier,
                )
            )
                return undefined
            reg = new JDRegisterServer<TValues>(this, identifier, defaultValue)
            this._registers.push(reg)
        }
        return reg
    }

    reset() {
        this.registers.forEach(reg => reg.reset())
    }

    /**
     * Locks the current set of registers
     */
    public lock() {
        this._locked = true
    }

    protected addCommand(identifier: number, handler: (pkt: Packet) => void) {
        if (this._locked) console.error(`adding command to locked service`)
        this.commands[identifier] = handler
    }

    async handlePacket(pkt: Packet) {
        if (pkt.isRegisterGet || pkt.isRegisterSet) {
            // find register to handle
            const rid = pkt.registerIdentifier
            let reg = this._registers.find(r => r.identifier === rid)
            if (!reg) {
                // try adding
                reg = this.addRegister(rid)
            }
            reg?.handlePacket(pkt)
        } else if (pkt.isCommand) {
            const cmd = this.commands[pkt.serviceCommand]
            if (cmd) cmd(pkt)
            else if (cmd === undefined)
                console.debug(`ignored command`, { pkt })
        }
        // ignored?
    }

    async sendPacketAsync(pkt: Packet) {
        if (this.twin) return

        pkt.serviceIndex = this.serviceIndex
        await this.device.sendPacketAsync(pkt)
    }

    async sendEvent(eventCode: number, data?: Uint8Array) {
        if (this.twin) return

        const { device } = this
        if (!device) return
        const { bus } = device
        if (!bus) return

        const now = bus.timestamp
        const cmd = device.createEventCmd(eventCode)
        const pkt = Packet.from(cmd, data || new Uint8Array(0))
        await this.sendPacketAsync(pkt)
        device.delayedSend(pkt, now + 20)
        device.delayedSend(pkt, now + 100)
    }

    private async handleCalibrate() {
        const [status] = this.statusCode.values()
        if (status !== SystemStatusCodes.Ready) return
        this.calibrate()
    }

    processLargeFrame(command: string, data: Uint8Array) {
        this.emit(FRAME_PROCESS_LARGE, command, data)
    }

    async calibrate() {
        // notify that calibration started
        this.statusCode.setValues([SystemStatusCodes.Calibrating, 0])
        // wait 5 seconds
        await this.device.bus.delay(CALIBRATION_DELAY)
        // finish
        this.statusCode.setValues([SystemStatusCodes.Ready, 0])
    }
}

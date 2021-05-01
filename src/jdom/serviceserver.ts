import {
    BaseEvent,
    SystemCmd,
    SystemReg,
    SystemStatusCodes,
} from "../../jacdac-spec/dist/specconstants"
import { CHANGE, PACKET_RECEIVE, PACKET_SEND } from "./constants"
import JDServiceProvider from "./serviceprovider"
import { JDEventSource } from "./eventsource"
import Packet from "./packet"
import JDRegisterServer from "./registerserver"
import { isRegister, serviceSpecificationFromClassIdentifier } from "./spec"
import { delay } from "./utils"
import { PackedValues } from "./pack"
import { JDService } from "./service"

const CALIBRATION_DELAY = 5000
export interface ServerOptions {
    instanceName?: string
    /**
     * This server instance is a twin of a physical device and should not emit any packet
     */
    twin?: JDService
    valueValues?: PackedValues
    intensityValues?: PackedValues
    variant?: number
    registerValues?: {
        code: number
        values: PackedValues
    }[]
}

export default class JDServiceServer extends JDEventSource {
    public serviceIndex = -1 // set by device
    public device: JDServiceProvider
    public readonly specification: jdspec.ServiceSpec
    private readonly _registers: JDRegisterServer<PackedValues>[] = []
    private readonly commands: {
        [identifier: number]: (pkt: Packet) => void
    } = {}
    readonly statusCode: JDRegisterServer<[SystemStatusCodes, number]>
    readonly instanceName: JDRegisterServer<[string]>
    private _twin: JDService

    constructor(public readonly serviceClass: number, options?: ServerOptions) {
        super()
        const {
            instanceName,
            variant,
            valueValues,
            intensityValues,
            registerValues,
        } = options || {}

        this.specification = serviceSpecificationFromClassIdentifier(
            this.serviceClass
        )

        this.statusCode = this.addRegister<[SystemStatusCodes, number]>(
            SystemReg.StatusCode,
            [SystemStatusCodes.Ready, 0]
        )
        if (valueValues) this.addRegister(SystemReg.Value, valueValues)
        if (intensityValues)
            this.addRegister(SystemReg.Intensity, intensityValues)
        if (variant) this.addRegister<[number]>(SystemReg.Variant, [variant])
        this.instanceName = this.addRegister<[string]>(SystemReg.InstanceName, [
            instanceName || "",
        ])

        // any extra
        registerValues?.forEach(({ code, values }) =>
            this.addRegister<PackedValues>(code, values)
        )

        // emit event when status code changes
        this.statusCode.on(CHANGE, () =>
            this.sendEvent(BaseEvent.StatusCodeChanged, this.statusCode.data)
        )

        // if the device has a calibrate command, regiser handler
        // and put device in calibrationneeded state
        if (
            this.specification.packets.find(
                pkt =>
                    pkt.kind === "command" &&
                    pkt.identifier === SystemCmd.Calibrate
            )
        ) {
            this.addCommand(
                SystemCmd.Calibrate,
                this.handleCalibrate.bind(this)
            )
            this.statusCode.setValues(
                [SystemStatusCodes.CalibrationNeeded, 0],
                true
            )
        }

        this.handleTwinPacket = this.handleTwinPacket.bind(this)
    }

    get twin() {
        return this._twin
    }

    set twin(service: JDService) {
        if (service === this._twin)
            return;
        
        if (this._twin) {
            this._twin.off(PACKET_RECEIVE, this.handleTwinPacket)
            this._twin.off(PACKET_SEND, this.handleTwinPacket)
        }
        this._twin = service
        if (this._twin) {
            this._twin.on(PACKET_RECEIVE, this.handleTwinPacket)
            this._twin.on(PACKET_SEND, this.handleTwinPacket)
            this._twin.registers().forEach(twinReg => {
                const reg = this.register(twinReg.code)
                reg?.setValues(twinReg.unpackedValue)
            })
        }

        this.emit(CHANGE)
    }

    private handleTwinPacket(pkt: Packet) {
        console.log(`twin ${pkt}`, { pkt })
        this.handlePacket(pkt)
    }

    get registers() {
        return this._registers.slice(0)
    }

    register<TValues extends PackedValues = PackedValues>(
        code: number
    ): JDRegisterServer<TValues> {
        return this._registers.find(
            reg => reg.identifier === code
        ) as JDRegisterServer<TValues>
    }

    protected addRegister<TValues extends PackedValues = PackedValues>(
        identifier: number,
        defaultValue?: TValues
    ): JDRegisterServer<TValues> {
        let reg = this._registers.find(
            r => r.identifier === identifier
        ) as JDRegisterServer<TValues>
        if (!reg) {
            // make sure this register is supported
            if (
                !this.specification.packets.find(
                    pkt => isRegister(pkt) && pkt.identifier === identifier
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

    protected addCommand(identifier: number, handler: (pkt: Packet) => void) {
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
            else if (cmd === undefined) console.log(`ignored command`, { pkt })
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

    async calibrate() {
        // notify that calibration started
        this.statusCode.setValues([SystemStatusCodes.Calibrating, 0])
        // wait 5 seconds
        await delay(CALIBRATION_DELAY)
        // finish calibraion
        this.statusCode.setValues([SystemStatusCodes.Ready, 0])
    }
}

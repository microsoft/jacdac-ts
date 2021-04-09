import {
    BaseEvent,
    SystemCmd,
    SystemReg,
    SystemStatusCodes,
} from "../../jacdac-spec/dist/specconstants"
import { CHANGE } from "./constants"
import JDServiceProvider from "./serviceprovider"
import { JDEventSource } from "./eventsource"
import Packet from "./packet"
import JDRegisterServer from "./registerserver"
import { isRegister, serviceSpecificationFromClassIdentifier } from "./spec"
import { delay } from "./utils"

const CALIBRATION_DELAY = 5000
export interface ServerOptions {
    instanceName?: string
    valueValues?: any[]
    intensityValues?: any[]
    variant?: number
    registerValues?: {
        code: number
        values: any[]
    }[]
}

export default class JDServiceServer extends JDEventSource {
    public serviceIndex = -1 // set by device
    public device: JDServiceProvider
    public readonly specification: jdspec.ServiceSpec
    private readonly _registers: JDRegisterServer<any[]>[] = []
    private readonly commands: {
        [identifier: number]: (pkt: Packet) => void
    } = {}
    readonly statusCode: JDRegisterServer<[SystemStatusCodes, number]>
    readonly instanceName: JDRegisterServer<[string]>

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
            this.addRegister<any[]>(code, values)
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
    }

    get registers() {
        return this._registers.slice(0)
    }

    register<TValues extends any[] = any[]>(
        identifier: number
    ): JDRegisterServer<TValues> {
        return this._registers.find(
            reg => reg.identifier === identifier
        ) as JDRegisterServer<TValues>
    }

    protected addRegister<TValues extends any[] = any[]>(
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
        pkt.serviceIndex = this.serviceIndex
        await this.device.sendPacketAsync(pkt)
    }

    async sendEvent(eventCode: number, data?: Uint8Array) {
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

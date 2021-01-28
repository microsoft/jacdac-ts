import { BaseReg, SystemCmd, SystemReg, SystemStatusCodes } from "../../jacdac-spec/dist/specconstants";
import { NumberFormat, setNumber } from "./buffer";
import JDDeviceHost from "./devicehost";
import { JDEventSource } from "./eventsource";
import Packet from "./packet";
import JDRegisterHost from "./registerhost";
import { isRegister, serviceSpecificationFromClassIdentifier } from "./spec";
import { memcpy } from "./utils";

export interface JDServiceHostOptions {
    valueValues?: any[];
    intensityValues?: any[];
    variant?: number;
    registerValues?: {
        code: number,
        values: any[]
    }[]
}

export default class JDServiceHost extends JDEventSource {
    public serviceIndex: number = -1; // set by device
    public device: JDDeviceHost;
    public readonly specification: jdspec.ServiceSpec;
    private readonly _registers: JDRegisterHost<any[]>[] = [];
    private readonly commands: { [identifier: number]: (pkt: Packet) => void } = {};
    readonly statusCode: JDRegisterHost<[SystemStatusCodes, number]>;

    constructor(public readonly serviceClass: number, options?: JDServiceHostOptions) {
        super();
        const { variant, valueValues, intensityValues, registerValues } = options || {};

        this.specification = serviceSpecificationFromClassIdentifier(this.serviceClass);

        this.statusCode = this.addRegister<[SystemStatusCodes, number]>(SystemReg.StatusCode, [SystemStatusCodes.Ready, 0]);
        if (valueValues)
            this.addRegister(SystemReg.Value, valueValues);
        if (intensityValues)
            this.addRegister(SystemReg.Intensity, intensityValues);
        if (variant)
            this.addRegister<[number]>(SystemReg.Variant, [variant]);
        // any extra
        registerValues?.forEach(({ code, values }) => this.addRegister<any[]>(code, values));
    }

    get registers() {
        return this._registers.slice(0);
    }

    register<TValues extends any[] = any[]>(identifier: number): JDRegisterHost<TValues> {
        return this._registers.find(reg => reg.identifier === identifier) as JDRegisterHost<TValues>;
    }

    protected addRegister<TValues extends any[] = any[]>(identifier: number, defaultValue?: TValues): JDRegisterHost<TValues> {
        let reg = this._registers.find(r => r.identifier === identifier) as JDRegisterHost<TValues>;
        if (!reg) {
            // make sure this register is supported
            if (!this.specification.packets.find(pkt => isRegister(pkt) && pkt.identifier === identifier))
                return undefined;
            reg = new JDRegisterHost<TValues>(this, identifier, defaultValue);
            this._registers.push(reg);
        }
        return reg;
    }

    protected addCommand(identifier: number, handler: (pkt: Packet) => void) {
        this.commands[identifier] = handler;
    }

    async handlePacket(pkt: Packet) {
        if (pkt.isRegisterGet || pkt.isRegisterSet) {
            // find register to handle
            const rid = pkt.registerIdentifier;
            let reg = this._registers.find(r => r.identifier === rid);
            if (!reg) {
                // try adding
                reg = this.addRegister(rid);
            }
            reg?.handlePacket(pkt)
        } else if (pkt.isCommand) {
            const cmd = this.commands[pkt.serviceCommand];
            if (cmd)
                cmd(pkt);
            else if (cmd === undefined)
                console.log(`ignored command`, { pkt })
        }
        // ignored?
    }

    async sendPacketAsync(pkt: Packet) {
        pkt.serviceIndex = this.serviceIndex;
        await this.device.sendPacketAsync(pkt);
    }

    protected async sendEvent(event: number, data?: Uint8Array) {
        const payload = new Uint8Array(4 + (data ? data.length : 0))
        setNumber(payload, NumberFormat.UInt32LE, 0, event);
        if (data)
            memcpy(payload, 4, data);
        await this.sendPacketAsync(Packet.from(SystemCmd.Event, payload))
    }
}

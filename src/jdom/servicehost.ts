import { BaseReg, SystemCmd, SystemReg } from "../../jacdac-spec/dist/specconstants";
import { NumberFormat, setNumber } from "./buffer";
import JDDeviceHost from "./devicehost";
import { JDEventSource } from "./eventsource";
import Packet from "./packet";
import JDRegisterHost from "./registerhost";
import { isRegister, serviceSpecificationFromClassIdentifier } from "./spec";
import { memcpy } from "./utils";

export interface JDServiceHostOptions {
    variant?: number;
}

export default class JDServiceHost extends JDEventSource {
    public serviceIndex: number = -1; // set by device
    public device: JDDeviceHost;
    public readonly specification: jdspec.ServiceSpec;
    private readonly _registers: JDRegisterHost[] = [];
    private readonly commands: { [identifier: number]: (pkt: Packet) => void } = {};

    constructor(public readonly serviceClass: number, options?: JDServiceHostOptions) {
        super();
        const { variant } = options || {};

        this.specification = serviceSpecificationFromClassIdentifier(this.serviceClass);

        this.addRegister(BaseReg.StatusCode);
        if (variant)
            this.addRegister(SystemReg.Variant, [variant]);
    }

    get registers() {
        return this._registers.slice(0);
    }

    register(identifier: number) {
        return this._registers.find(reg => reg.identifier === identifier);
    }

    get statusCode() {
        return this._registers.find(reg => reg.identifier === BaseReg.StatusCode);
    }

    protected addRegister(identifier: number, defaultValue?: any[]) {
        let reg = this._registers.find(r => r.identifier === identifier);
        if (!reg) {
            // make sure this register is supported
            if (!this.specification.packets.find(pkt => isRegister(pkt) && pkt.identifier === identifier))
                return undefined;
            reg = new JDRegisterHost(this, identifier, defaultValue);
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

    protected async sendEvent(eventCode: number, data?: Uint8Array) {
        const { bus } = this.device;
        const pkt = Packet.from(this.device.createEventCmd(eventCode), data)
        await this.sendPacketAsync(pkt)
        const now = bus.timestamp
        bus.delayedSend(pkt, now + 20)
        bus.delayedSend(pkt, now + 100)
    }

    refreshRegisters() {
        // noop by default, implemented in sensor mostly
    }
}

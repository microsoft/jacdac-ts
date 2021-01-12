import { BaseReg, SystemCmd } from "../../jacdac-spec/dist/specconstants";
import { NumberFormat, setNumber } from "./buffer";
import JDDeviceHost from "./devicehost";
import { JDEventSource } from "./eventsource";
import Packet from "./packet";
import JDRegisterHost from "./registerhost";
import { serviceSpecificationFromClassIdentifier } from "./spec";
import { memcpy } from "./utils";

export default class JDServiceHost extends JDEventSource {
    public serviceIndex: number = -1; // set by device
    public device: JDDeviceHost;
    public readonly specification: jdspec.ServiceSpec;
    private readonly _registers: JDRegisterHost[] = [];
    private readonly commands: { [identifier: number]: (pkt: Packet) => void } = {};

    constructor(public readonly serviceClass: number) {
        super();

        this.specification = serviceSpecificationFromClassIdentifier(this.serviceClass);
        this.addRegister(BaseReg.StatusCode)
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
        const reg = new JDRegisterHost(this, identifier, defaultValue);
        this._registers.push(reg);
        return reg;
    }

    protected addCommand(identifier: number, handler: (pkt: Packet) => void) {
        this.commands[identifier] = handler;
    }

    async handlePacket(pkt: Packet) {
        if (pkt.isRegisterGet || pkt.isRegisterSet) {
            // find register to handle
            for (const reg of this._registers)
                if (reg.handlePacket(pkt))
                    break;
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

    refreshRegisters() {
        // noop by default, implemented in sensor mostly
    }
}

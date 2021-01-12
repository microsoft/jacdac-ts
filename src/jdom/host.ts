import { BaseReg, ControlAnnounceFlags, ControlCmd, ProtoTestCmd, ProtoTestEvent, ProtoTestReg, SRV_PROTO_TEST, SystemCmd, SystemEvent } from "../../jacdac-spec/dist/specconstants";
import { NumberFormat, setNumber } from "./buffer";
import { JDBus } from "./bus";
import { CHANGE, CMD_GET_REG, IDENTIFY, JD_SERVICE_INDEX_CRC_ACK, PACKET_PROCESS, PACKET_SEND, RESET, SELF_ANNOUNCE, SRV_CTRL } from "./constants";
import { JDEventSource } from "./eventsource";
import { jdpack, jdunpack } from "./pack";
import Packet from "./packet";
import { shortDeviceId } from "./pretty";
import { anyRandomUint32, bufferEq, memcpy, toHex } from "./utils";

export class JDRegisterHost extends JDEventSource {
    data: Uint8Array;

    constructor(
        public readonly service: JDServiceHost,
        public readonly identifier: number,
        public readonly packFormat: string,
        defaultValue: any[]) {
        super();
        this.data = jdpack(this.packFormat, defaultValue);
    }

    values<T extends any[]>(): T {
        return jdunpack(this.data, this.packFormat) as T;
    }

    setValues<T extends any[]>(values: T) {
        const d = jdpack(this.packFormat, values);
        if (!bufferEq(this.data, d)) {
            this.data = d;
            this.emit(CHANGE);
        }
    }

    sendReport() {
        this.service.sendPacketAsync(Packet.from(this.identifier | CMD_GET_REG, this.data));
    }

    handlePacket(pkt: Packet): boolean {
        if (this.identifier !== pkt.registerIdentifier)
            return false;

        if (pkt.isRegisterGet) { // get
            this.service.sendPacketAsync(Packet.from(pkt.serviceCommand, this.data));
        } else if (this.identifier >> 8 !== 0x1) { // set, non-const
            const d = pkt.data;
            if (!bufferEq(this.data, d)) {
                this.data = d;
                this.emit(CHANGE);
            }
        }
        return true;
    }
}

export class JDServiceHost extends JDEventSource {
    public serviceIndex: number = -1; // set by device
    public device: JDDeviceHost;
    private readonly _registers: JDRegisterHost[] = [];
    private readonly commands: { [identifier: number]: (pkt) => void } = {};

    constructor(public readonly serviceClass: number) {
        super();

        this.addRegister(BaseReg.StatusCode, "u16 u16", [0, 0])
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

    protected addRegister(identifier: number, packFormat: string, defaultValue: any[]) {
        const reg = new JDRegisterHost(this, identifier, packFormat, defaultValue);
        this._registers.push(reg);
        return reg;
    }

    protected addCommand(identifier: number, handler: (pkt) => void) {
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

    protected sendEvent(event: number, data?: Uint8Array) {
        const payload = new Uint8Array(4 + (data ? data.length : 0))
        setNumber(payload, NumberFormat.UInt32LE, 0, event);
        if (data)
            memcpy(payload, 4, data);
        this.sendPacketAsync(Packet.from(SystemCmd.Event, payload))
    }

    protected sendChangeEvent() {
        this.sendEvent(SystemEvent.Change)
    }

}

export class ControlServiceHost extends JDServiceHost {
    private restartCounter = 0;
    private packetCount = 0;

    constructor() {
        super(SRV_CTRL)

        this.addCommand(ControlCmd.Services, this.announce.bind(this));
        this.addCommand(ControlCmd.Identify, this.identify.bind(this));
        this.addCommand(ControlCmd.Reset, this.reset.bind(this));
        this.addCommand(ControlCmd.Noop, null);
    }

    async announce() {
        if (this.restartCounter < 0xf)
            this.restartCounter++
        this.packetCount++;
        // restartCounter, flags, packetCount, serviceClass
        const pkt = Packet.jdpacked<[number, ControlAnnounceFlags, number, number[]]>(ControlCmd.Services, "u8 u8 u8 x[1] u32[]",
            [this.restartCounter,
            ControlAnnounceFlags.SupportsACK,
            this.packetCount,
            this.device.services().slice(1).map(srv => srv.serviceClass)])

        this.sendPacketAsync(pkt);

        // reset counter
        this.packetCount = 0;
    }

    async identify() {
        this.emit(IDENTIFY);
    }

    async reset() {
        this.emit(RESET);
        this.restartCounter = 0;
        this.packetCount = 0;
    }

}

export class ProtocolTestServiceHost extends JDServiceHost {
    constructor() {
        super(SRV_PROTO_TEST);


        const init = (rwi: number, roi: number, ci: number, ei: number, fmt: string, values: any[]) => {
            const rw = this.addRegister(rwi, fmt, values);
            const ro = this.addRegister(roi, rw.packFormat, rw.values());
            rw.on(CHANGE, () => {
                ro.setValues(rw.values())
                this.sendEvent(ei, rw.data);
            });

            this.addCommand(ci, pkt => rw.setValues(jdunpack(pkt.data, fmt)))
        }

        init(ProtoTestReg.RwBool, ProtoTestReg.RoBool, ProtoTestCmd.CBool, ProtoTestEvent.EBool, "u8", [false]);
        init(ProtoTestReg.RwI32, ProtoTestReg.RoI32, ProtoTestCmd.CI32, ProtoTestEvent.EI32, "i32", [0]);
        init(ProtoTestReg.RwU32, ProtoTestReg.RoU32, ProtoTestCmd.CU32, ProtoTestEvent.EU32, "u32", [0]);
        init(ProtoTestReg.RwString, ProtoTestReg.RoString, ProtoTestCmd.CString, ProtoTestEvent.EString, "s", [""]);
        init(ProtoTestReg.RwBytes, ProtoTestReg.RoBytes, ProtoTestCmd.CBytes, ProtoTestEvent.EBytes, "b", [new Uint8Array(0)]);
        init(ProtoTestReg.RwI8U8U16I32, ProtoTestReg.RoI8U8U16I32, ProtoTestCmd.CI8U8U16I32, ProtoTestEvent.EI8U8U16I32, "i8 u8 u16 i32", [0, 0, 0, 0]);
    }
}

export interface JDDeviceHostOptions {
    deviceId?: string;
}

export class JDDeviceHost extends JDEventSource {
    private _bus: JDBus;
    private readonly _services: JDServiceHost[];
    public readonly deviceId: string;
    public readonly shortId: string;

    constructor(services: JDServiceHost[], options?: JDDeviceHostOptions) {
        super();
        this._services = [new ControlServiceHost(), ...services];
        this.deviceId = options?.deviceId;
        if (!this.deviceId) {
            const devId = anyRandomUint32(8);
            for (let i = 0; i < 8; ++i) devId[i] &= 0xff;
            this.deviceId = toHex(devId);
        }
        this.shortId = shortDeviceId(this.deviceId);
        this._services.forEach((srv, i) => {
            srv.device = this;
            srv.serviceIndex = i;
        });

        this.handleSelfAnnounce = this.handleSelfAnnounce.bind(this);
        this.handlePacket = this.handlePacket.bind(this);
    }

    protected log(msg: any) {
        console.log(`${this.shortId}: ${msg}`);
    }

    get bus() {
        return this._bus;
    }

    set bus(value: JDBus) {
        if (value !== this._bus) {
            this.stop();
            this._bus = value;
            this.start();
        }
    }

    private start() {
        if (!this._bus) return;

        this._bus.on(SELF_ANNOUNCE, this.handleSelfAnnounce);
        if (this._services.length)
            this._bus.on([PACKET_PROCESS, PACKET_SEND], this.handlePacket)
        this.log(`start host`)
    }

    private stop() {
        if (!this._bus) return;

        this._bus.off(SELF_ANNOUNCE, this.handleSelfAnnounce);
        this._bus.off([PACKET_PROCESS, PACKET_SEND], this.handlePacket)
        this.log(`stop host`)
        this._bus = undefined;
    }

    private handleSelfAnnounce() {
        const ctrl = this._services[0] as ControlServiceHost;
        ctrl.announce();
    }

    services(): JDServiceHost[] {
        return this._services.slice(0);
    }

    toString() {
        return `host ${this.shortId}`;
    }

    async sendPacketAsync(pkt: Packet) {
        if (!this._bus) return;

        pkt.deviceIdentifier = this.deviceId;
        // compute crc and send
        pkt.sendCoreAsync(this.bus);
        // send to current bus
        this.bus.processPacket(pkt);
    }

    private handlePacket(pkt: Packet) {
        const devIdMatch = pkt.deviceIdentifier == this.deviceId;
        if (pkt.requiresAck && devIdMatch) {
            pkt.requiresAck = false // make sure we only do it once
            const crc = pkt.crc;
            const ack = Packet.onlyHeader(crc)
            ack.serviceIndex = JD_SERVICE_INDEX_CRC_ACK;
            this.sendPacketAsync(pkt);
        }

        if (pkt.isMultiCommand) {
            if (!pkt.isCommand)
                return; // only commands supported
            const multiCommandClass = pkt.serviceClass;
            const h = this._services.find(s => s.serviceClass == multiCommandClass);
            if (h) {
                // pretend it's directly addressed to us
                pkt.deviceIdentifier = this.deviceId
                pkt.serviceIndex = h.serviceIndex
                h.handlePacket(pkt)
            }
        } else if (devIdMatch) {
            if (!pkt.isCommand)
                return // huh? someone's pretending to be us?
            const h = this._services[pkt.serviceIndex]
            if (h) {
                // log(`handle pkt at ${h.name} cmd=${pkt.service_command}`)
                h.handlePacket(pkt)
            }
        } else {
            if (pkt.isCommand)
                return // it's a command, and it's not for us
            if (pkt.serviceIndex == JD_SERVICE_INDEX_CRC_ACK) {
                // TODO
                //_gotAck(pkt)
            }
        }
    }
}
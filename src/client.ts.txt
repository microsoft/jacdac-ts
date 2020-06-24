import { Device, Bus } from "./device";
import { Packet } from "./packet";
import { NumberFormat, getNumber } from "./utils";
import { CMD_SET_REG, CMD_ADVERTISEMENT_DATA, CMD_EVENT } from "./constants";
import { EventEmitter } from "./eventemitter";

class ClientPacketQueue {
    private pkts: Uint8Array[] = []

    constructor(public parent: Client) { }

    private updateQueue(pkt: Packet) {
        const cmd = pkt.service_command
        for (let i = 0; i < this.pkts.length; ++i) {
            if (getNumber(this.pkts[i], NumberFormat.UInt16LE, 2) == cmd) {
                this.pkts[i] = pkt.withFrameStripped()
                return
            }
        }
        this.pkts.push(pkt.withFrameStripped())
    }

    clear() {
        this.pkts = []
    }

    send(pkt: Packet) {
        if (pkt.is_reg_set || this.parent.serviceNumber == null)
            this.updateQueue(pkt)
        this.parent.sendCommand(pkt)
    }

    resend() {
        const sn = this.parent.serviceNumber
        if (sn == null || this.pkts.length == 0)
            return
        let hasNonSet = false
        for (let p of this.pkts) {
            p[1] = sn
            if ((p[3] >> 4) != (CMD_SET_REG >> 12))
                hasNonSet = true
        }
        const pkt = Packet.onlyHeader(0)
        pkt.compress(this.pkts)
        this.parent.sendCommand(pkt)
        // after re-sending only leave set_reg packets
        if (hasNonSet)
            this.pkts = this.pkts.filter(p => (p[3] >> 4) == (CMD_SET_REG >> 12))
    }
}

export class Client extends EventEmitter {
    device: Device
    eventId: number
    broadcast: boolean // when true, this.device is never set
    serviceNumber: number;
    protected supressLog: boolean;
    started: boolean;
    advertisementData: Uint8Array;

    private config: ClientPacketQueue

    constructor(
        public bus: Bus,
        public name: string,
        public serviceClass: number,
        public requiredDeviceName: string
    ) {
        super();
        this.config = new ClientPacketQueue(this)
    }

    broadcastDevices() {
        return this.bus.devices().filter(d => d.hasService(this.serviceClass))
    }

    isConnected() {
        return !!this.device
    }

    requestAdvertisementData() {
        this.sendCommand(Packet.onlyHeader(CMD_ADVERTISEMENT_DATA))
    }

    handlePacketOuter(pkt: Packet) {
        if (pkt.service_command == CMD_ADVERTISEMENT_DATA)
            this.advertisementData = pkt.data

        if (pkt.service_command == CMD_EVENT)
            control.raiseEvent(this.eventId, pkt.intData)

        this.handlePacket(pkt)
    }

    handlePacket(pkt: Packet) { }

    _attach(dev: Device, serviceNum: number) {
        if (this.device) throw new Error("Invalid attach")
        if (!this.broadcast) {
            if (this.requiredDeviceName && this.requiredDeviceName != dev.name && this.requiredDeviceName != dev.deviceId)
                return false // don't attach
            this.device = dev
            this.serviceNumber = serviceNum
            _unattachedClients.removeElement(this)
        }
        console.log(`attached ${dev.toString()}/${serviceNum} to client ${this.name}`)
        dev.clients.push(this)
        this.onAttach()
        this.config.resend()
        return true
    }

    _detach() {
        this.log(`dettached ${this.name}`)
        this.serviceNumber = null
        if (!this.broadcast) {
            if (!this.device) throw new Error("Invalid detach")
            this.device = null
            _unattachedClients.push(this)
            clearAttachCache()
        }
        this.onDetach()
    }

    protected onAttach() { }
    protected onDetach() { }

    async sendCommand(pkt: Packet) {
        this.start()
        if (this.serviceNumber == null)
            return
        pkt.service_number = this.serviceNumber
        await pkt.sendCmdAsync(this.device)
    }

    async sendCommandWithAck(pkt: Packet) {
        this.start()
        if (this.serviceNumber == null)
            return
        pkt.service_number = this.serviceNumber
        if (!pkt._sendWithAck(this.device))
            throw new Error("No ACK")
    }

    setRegBuffer(reg: number, value: Uint8Array) {
        this.start()
        this.config.send(Packet.from(CMD_SET_REG | reg, value))
    }

    /*
    protected registerEvent(value: number, handler: () => void) {
        this.start()
        control.onEvent(this.eventId, value, handler);
    }
    */

    start() {
        if (this.started) return
        this.started = true
        jacdac.start()
        _unattachedClients.push(this)
        _allClients.push(this)
        clearAttachCache()
    }

    destroy() {
        if (this.device)
            this.device.clients.removeElement(this)
        _unattachedClients.removeElement(this)
        _allClients.removeElement(this)
        this.serviceNumber = null
        this.device = null
        clearAttachCache()
    }
}
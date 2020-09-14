import { JDNode } from "./node";
import { JDService } from "./service";

export abstract class JDServiceMemberNode extends JDNode {
    private _specification: jdspec.PacketInfo;

    constructor(
        public readonly service: JDService,
        public readonly address: number,
        private readonly isPacket: (pkt: jdspec.PacketInfo) => boolean) {
        super()
    }

    get id() {
        return `${this.nodeKind}:${this.service.device.deviceId}:${this.service.service_number.toString(16)}:${this.address.toString(16)}`
    }

    get name() {
        return this.specification?.name || this.address.toString(16);
    }

    get qualifiedName() {
        return `${this.service.qualifiedName}.${this.name}`
    }

    get specification() {
        if (!this._specification)
            this._specification = this.service.specification?.packets.find(packet => this.isPacket(packet) && packet.identifier === this.address)
        return this._specification;
    }

    get parent(): JDNode {
        return this.service
    }
}
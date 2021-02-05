import { JDNode } from "./node";
import { JDService } from "./service";

export abstract class JDServiceMemberNode extends JDNode {
    private _specification: jdspec.PacketInfo;

    constructor(
        public readonly service: JDService,
        public readonly code: number,
        private readonly isPacket: (pkt: jdspec.PacketInfo) => boolean) {
        super()
        this._specification = null;
    }

    get id() {
        return `${this.nodeKind}:${this.service.device.deviceId}:${this.service.service_index.toString(16)}:${this.code.toString(16)}`
    }

    get name() {
        return this.specification?.name || this.code.toString(16);
    }

    get qualifiedName() {
        return `${this.service.qualifiedName}.${this.name}`
    }

    get specification() {
        if (this._specification === null) // lookup once
            this._specification = this.service.specification?.packets.find(packet => this.isPacket(packet) && packet.identifier === this.code)
        return this._specification;
    }

    get parent(): JDNode {
        return this.service
    }

    get friendlyName() {
        const parts = [this.service.friendlyName, this.name]
        return parts.join('.')
    }
}
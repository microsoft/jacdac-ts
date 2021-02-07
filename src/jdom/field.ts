import { FIELD_NODE_NAME } from "./constants"
import { JDRegister } from "./register"
import { JDNode } from "./node"
import { DecodedMember } from "./pretty"

export class JDField extends JDNode {
    constructor(
        public readonly register: JDRegister,
        public readonly index: number,
        public readonly specification: jdspec.PacketMember
    ) {
        super()
    }

    get id(): string {
        return `${this.nodeKind}:${this.register.service.device.deviceId}:${this.register.service.serviceIndex.toString(16)}:${this.register.code.toString(16)}:${this.index.toString(16)}`
    }

    get name(): string {
        return this.specification.name === "_" ? this.register.specification.name : this.specification.name
    }

    get children(): JDNode[] {
        return [];
    }

    get qualifiedName(): string {
        return `${this.register.qualifiedName}.${this.name}`
    }

    get parent(): JDNode {
        return this.register
    }

    get friendlyName() {
        const parts = [this.register.friendlyName]
        if (this.specification.name !== "_")
            parts.push(this.name)
        return parts.join('.')
    }

    get unit(): jdspec.Unit {
        return this.specification.unit;
    }

    get nodeKind(): string {
        return FIELD_NODE_NAME
    }

    get decoded(): DecodedMember {
        const decoded = this.register.decoded;
        return decoded?.decoded[this.index]
    }

    get value(): any {
        return this.decoded?.value
    }
}
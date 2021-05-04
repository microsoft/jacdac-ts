import { FIELD_NODE_NAME } from "./constants"
import { JDNode } from "./node"
import { DecodedMember } from "./pretty"
import { JDServiceMemberNode } from "./servicemembernode"

export class JDField extends JDNode {
    constructor(
        public readonly member: JDServiceMemberNode,
        public readonly index: number,
        public readonly specification: jdspec.PacketMember
    ) {
        super()
    }

    get id(): string {
        return `${this.nodeKind}:${
            this.member.service.device.deviceId
        }:${this.member.service.serviceIndex.toString(
            16
        )}:${this.member.code.toString(16)}:${this.index.toString(16)}`
    }

    get name(): string {
        return this.specification.name === "_"
            ? this.member.specification.name
            : this.specification.name
    }

    get children(): JDNode[] {
        return []
    }

    get qualifiedName(): string {
        return `${this.member.qualifiedName}.${this.name}`
    }

    get parent(): JDNode {
        return this.member
    }

    get friendlyName() {
        const parts = [this.member.friendlyName]
        if (this.specification.name !== "_") parts.push(this.name)
        return parts.join(".")
    }

    get unit(): jdspec.Unit {
        return this.specification.unit
    }

    get nodeKind(): string {
        return FIELD_NODE_NAME
    }

    get decoded(): DecodedMember {
        const decoded = this.member.decoded
        return decoded?.decoded[this.index]
    }

    get value(): any {
        return this.decoded?.value
    }
}

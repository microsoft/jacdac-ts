import { FIELD_NODE_NAME } from "./constants"
import { JDNode } from "./node"
import { DecodedMember } from "./pretty"
import { JDServiceMemberNode } from "./servicemembernode"

/**
 * A Jacdac field.
 * @category JDOM
 */
export class JDField extends JDNode {
    /**
     * Gets the parent JDOM member
     * @category JDOM
     */
    readonly member: JDServiceMemberNode
    /**
     * Gets the index in the unpacked data payload
     * @category Specification
     */
    readonly index: number
    /**
     * Gets the field specification
     * @category Specification
     */
    readonly specification: jdspec.PacketMember

    /**
     * @internal
     */
    constructor(
        member: JDServiceMemberNode,
        index: number,
        specification: jdspec.PacketMember
    ) {
        super()
        this.member = member
        this.index = index
        this.specification = specification
    }

    /**
     * Gets the JDOM node identifier
     * @category JDOM
     */
    get id(): string {
        return `${this.nodeKind}:${
            this.member.service.device.deviceId
        }:${this.member.service.serviceIndex.toString(
            16
        )}:${this.member.code.toString(16)}:${this.index.toString(16)}`
    }

    /**
     * Gets the JDOM name
     * @category JDOM
     */
    get name(): string {
        return this.specification.name === "_"
            ? this.member.specification.name
            : this.specification.name
    }

    /**
     * @internal
     */
    get children(): JDNode[] {
        return []
    }

    /**
     * Gets the JDOM qualified name
     * @category JDOM
     */
    get qualifiedName(): string {
        return `${this.member.qualifiedName}.${this.name}`
    }

    /**
     * Gets the JDOM parent
     * @category JDOM
     */
    get parent(): JDNode {
        return this.member
    }

    /**
     * Gets the JDOM friendly name
     * @category JDOM
     */
    get friendlyName() {
        const parts = [this.member.friendlyName]
        if (this.specification.name !== "_") parts.push(this.name)
        return parts.join(".")
    }

    /**
     * @internal
     */
    get dataTypeName(): string {
        const parts = [this.member.service.specification.shortName, this.name]
        return parts.join(".")
    }

    /**
     * Gets the unit of the data stored in the field
     * @category Data
     */
    get unit(): jdspec.Unit {
        return this.specification.unit
    }

    /**
     * Gets ``FIELD_NODE_NAME``
     * @category JDOM
     */
    get nodeKind(): string {
        return FIELD_NODE_NAME
    }

    /**
     * @internal
     */
    get decoded(): DecodedMember {
        const decoded = this.member.decoded
        return decoded?.decoded[this.index]
    }

    /**
     * Gets the decoded field value
     * @category Data
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get value(): any {
        return this.decoded?.value
    }
}



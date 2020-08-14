import { FIELD_NODE_NAME } from "./constants"
import { JDRegister } from "./register"
import { JDNode } from "./node"

export class JDField extends JDNode {
    constructor(
        public readonly register: JDRegister,
        public readonly index: number,
        public readonly specification: jdspec.PacketMember
    ) {
        super()
    }

    get id() {
        return `${this.nodeKind}:${this.register.service.device.deviceId}:${this.register.service.service_number.toString(16)}:${this.register.address.toString(16)}:${this.index.toString(16)}`
    }

    get name() {
        return this.specification.name === "_" ? this.register.specification.name : this.specification.name
    }

    get qualifiedName() {
        return `${this.register.qualifiedName}.${this.name}`
    }

    get unit() {
        return this.specification.unit;
    }

    get nodeKind() {
        return FIELD_NODE_NAME
    }

    get decoded() {
        const decoded = this.register.decoded;
        return decoded?.decoded[this.index]
    }

    get value() {
        if (this.unit == "frac")
            return this.decoded?.scaledValue
        else
            return this.decoded?.numValue
    }
}
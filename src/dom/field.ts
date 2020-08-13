import { FIELD_NODE_NAME } from "./constants"
import { JDRegister } from "./jacdac"

export class JDField extends Node {
    constructor(
        public readonly register: JDRegister,
        public readonly index: number,
        public readonly specification: jdspec.PacketMember
    ) {
        super()
    }

    id() {
        return `${this.nodeType}:${this.register.service.device.deviceId}:${this.register.service.serviceClass.toString(16)}:${this.register.address.toString(16)}:${this.index.toString(16)}`
    }

    nodeKind() {
        return FIELD_NODE_NAME
    }
}
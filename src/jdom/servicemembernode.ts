import { JDNode } from "./node"
import { JDService } from "./service"
import { DecodedPacket } from "./pretty"
import { CHANGE } from "./constants"

/**
 * Base class for JDOM service member classes.
 * @category JDOM
 */
export abstract class JDServiceMemberNode extends JDNode {
    private _specification: jdspec.PacketInfo
    private _notImplemented = false

    /**
     * Parent service
     * @category JDOM
     */
    public readonly service: JDService
    /**
     * Identifier of the event.
     * @category Specification
     */
    public readonly code: number

    private readonly isPacket: (pkt: jdspec.PacketInfo) => boolean

    /**
     * @internal
     */
    constructor(
        service: JDService,
        code: number,
        isPacket: (pkt: jdspec.PacketInfo) => boolean
    ) {
        super()
        this._specification = null
        this.service = service
        this.code = code
        this.isPacket = isPacket
    }

    /**
     * Gets the node identifier in the JDOM tree
     * @category JDOM
     */
    get id() {
        return `${this.nodeKind}:${
            this.service.device.deviceId
        }:${this.service.serviceIndex.toString(16)}:${this.code.toString(16)}`
    }

    /**
     * Gets the event name, if specified.
     * @category JDOM
     */
    get name() {
        return this.specification?.name || this.code.toString(16)
    }

    /**
     * Gets the qualitified event name, if specified.
     * @category JDOM
     */
    get qualifiedName() {
        return `${this.service.qualifiedName}.${this.name}`
    }

    /**
     * Gets the event specification if known.
     * @category Specification
     */
    get specification() {
        if (this._specification === null)
            // lookup once
            this._specification = this.service.specification?.packets.find(
                packet =>
                    this.isPacket(packet) && packet.identifier === this.code
            )
        return this._specification
    }

    /**
     * Gets the parent service client instance.
     * @category JDOM
     */
    get parent(): JDNode {
        return this.service
    }

    /**
     * Gets the event friendly name.
     * @category JDOM
     */
    get friendlyName() {
        const parts = [this.service.friendlyName, this.name]
        return parts.join(".")
    }

    /**
     * Indicates if the member is not implemented on the server side
     * @category JDOM
     */
    get notImplemented() {
        return this._notImplemented
    }

    /**
     * Internal
     * @internal
     */
    setNotImplemented() {
        if (!this._notImplemented) {
            this._notImplemented = true
            this.emit(CHANGE)
        }
    }

    /**
     * @internal
     */
    abstract get decoded(): DecodedPacket
}

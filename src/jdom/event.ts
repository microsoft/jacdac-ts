import { JDNode } from "./node"
import { JDService } from "./service"
import { Packet } from "./packet"
import { CHANGE, EVENT, EVENT_NODE_NAME } from "./constants"
import { isEvent } from "./spec"
import { JDServiceMemberNode } from "./servicemembernode"
import { DecodedPacket } from "./pretty"
import { JDField } from "./field"

/**
 * A Jacdac event client.
 * @category JDOM
 */
export class JDEvent extends JDServiceMemberNode {
    private _lastReportPkt: Packet
    private _fields: JDField[]
    private _count = 0

    /**
     * @internal
     */
    constructor(service: JDService, code: number) {
        super(service, code, isEvent)
    }

    /**
     * Returns the ``EVENT_NODE_NAME`` identifier
     * @category JDOM
     */
    get nodeKind() {
        return EVENT_NODE_NAME
    }

    /**
     * Gets the field node
     * @category Service Clients
     */
    get fields() {
        if (!this._fields)
            this._fields = this.specification?.fields.map(
                (field, index) => new JDField(this, index, field),
            )
        return this._fields.slice()
    }

    /**
     * Gets the list of fields
     * @category JDOM
     */
    get children(): JDNode[] {
        return this.fields
    }

    /**
     * Gets the raw data attached to the last event packet
     * @category Data
     */
    get data() {
        return this._lastReportPkt?.data
    }

    /**
     * Gets the unpacked data attached to the last event packet, if the event specification is known.
     * @category Data
     */
    get unpackedValue() {
        const { packFormat } = this.specification || {}
        return packFormat && this._lastReportPkt?.jdunpack(packFormat)
    }

    /**
     * Gets a counter of occurences for this event.
     * @category Data
     */
    get count() {
        return this._count
    }

    /**
     * Gets the timestamp of the last packet with data received for this event.
     * @category Data
     */
    get lastDataTimestamp() {
        return this._lastReportPkt?.timestamp
    }
    /**
     * @internal
     */
    get decoded(): DecodedPacket {
        return this._lastReportPkt?.decoded
    }

    /**
     * @internal
     */
    processEvent(pkt: Packet) {
        this._lastReportPkt = pkt
        this._count++
        this.emitPropagated(EVENT, this)
        this.emit(CHANGE)
    }
}

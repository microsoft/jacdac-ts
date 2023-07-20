import { Packet } from "./packet"
import {
    CMD_SET_REG,
    REPORT_RECEIVE,
    REPORT_UPDATE,
    CHANGE,
    CMD_GET_REG,
    REGISTER_NODE_NAME,
    REGISTER_REFRESH_TIMEOUT,
    REGISTER_REFRESH_RETRY_1,
    REGISTER_REFRESH_RETRY_0,
    GET_ATTEMPT,
} from "./constants"
import { JDService } from "./service"
import { intOfBuffer, uintOfBuffer } from "./buffer"
import { bufferEq, toHex, fromUTF8, uint8ArrayToString } from "./utils"
import { DecodedPacket } from "./pretty"
import { isConstRegister, isRegister } from "./spec"
import { JDField } from "./field"
import { JDServiceMemberNode } from "./servicemembernode"
import { JDNode } from "./node"
import { jdpack, jdunpack, PackedValues } from "./pack"
import { PackedObject, unpackedToObject } from "./packobject"

/**
 * A Jacdac register client.
 * @category JDOM
 */
export class JDRegister extends JDServiceMemberNode {
    private _lastReportPkt: Packet
    private _fields: JDField[]
    private _lastSetTimestamp = -Infinity
    private _lastGetTimestamp = -Infinity
    private _lastGetAttempts = 0
    private _needsRefresh = false

    /**
     * @internal
     */
    constructor(service: JDService, code: number) {
        super(service, code, isRegister)
    }

    /**
     * Clears all cached data from the register
     */
    clearData() {
        this._lastReportPkt = undefined
        this._lastGetTimestamp = -Infinity
        this._lastGetAttempts = 0
        this.emit(REPORT_RECEIVE, this)
        this.emitPropagated(REPORT_UPDATE, this)
        this.emit(CHANGE)
    }

    /**
     * Returns ``REGISTER_NODE_NAME``
     * @category JDOM
     */
    get nodeKind() {
        return REGISTER_NODE_NAME
    }

    /**
     * Gets the list of field, if the specification is known
     * @category JDOM
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
     * Timestamp of the last ``register set`` packet
     * @category Packets
     */
    get lastSetTimestamp() {
        return this._lastSetTimestamp
    }

    /**
     * Timestamp of the last ``register get`` packet
     * @category Packets
     */
    get lastGetTimestamp() {
        return this._lastGetTimestamp
    }

    /**
     * Clears the get timestamp
     * @internal
     * @category Packets
     */
    clearGetTimestamp() {
        this._lastGetTimestamp = -Infinity
    }

    /**
     * Number of attempts to send a ``get`` packet without response
     * @category Packets
     */
    get lastGetAttempts() {
        return this._lastGetAttempts
    }

    /**
     * Send a message to set the register value
     * @param data packed data
     * @param autoRefresh immediately send a ``get`` packet
     * @returns
     * @category Packets
     */
    async sendSetAsync(data: Uint8Array, autoRefresh?: boolean): Promise<void> {
        if (this.notImplemented) return

        const cmd = CMD_SET_REG | this.code
        const pkt = Packet.from(cmd, data)
        this._lastSetTimestamp = this.service.device.bus.timestamp
        await this.service.sendPacketAsync(pkt, this.service.registersUseAcks)
        if (autoRefresh) this.scheduleRefresh()
    }

    /**
     * Requests the value of the register by sending a ``get`` packet
     * @returns
     * @category Packets
     */
    sendGetAsync(): Promise<void> {
        if (this.notImplemented) return Promise.resolve()
        if (isConstRegister(this.specification) && !!this.data)
            return Promise.resolve()

        this._lastGetTimestamp = this.service.device.bus.timestamp
        this._lastGetAttempts++
        const cmd = CMD_GET_REG | this.code
        return this.service
            .sendCmdAsync(cmd, undefined, this.service.registersUseAcks)
            .then(() => {
                this.emit(GET_ATTEMPT)
            })
    }

    /**
     * Send a message to set the register value
     * @param values message to pack and send
     * @param autoRefresh immediately send a ``get`` packet
     * @category Packets
     */
    sendSetPackedAsync(
        values: PackedValues,
        autoRefresh?: boolean,
    ): Promise<void> {
        const fmt = this.specification?.packFormat
        if (!fmt) throw new Error("unknown register data format")
        return this.sendSetAsync(jdpack(fmt, values), autoRefresh)
    }

    /**
     * Sends a message to set the register value as a bpolean
     * @param value
     * @param autoRefresh
     * @param autoRefresh immediately send a ``get`` packet
     * @category Packets
     */
    sendSetBoolAsync(value: boolean, autoRefresh?: boolean): Promise<void> {
        return this.sendSetPackedAsync([value ? 1 : 0], autoRefresh)
    }

    /**
     * Sends a message to set the register value as a string
     * @param value
     * @param autoRefresh
     * @param autoRefresh immediately send a ``get`` packet
     * @category Packets
     */
    sendSetStringAsync(value: string, autoRefresh?: boolean): Promise<void> {
        return this.sendSetPackedAsync([value || ""], autoRefresh)
    }

    /**
     * Gets the raw data from the last report packet
     * @category Data
     */
    get data() {
        return this._lastReportPkt?.data
    }

    /**
     * Gets the timestamp when received the last report with data
     * @category Data
     */
    get lastDataTimestamp() {
        return this._lastReportPkt?.timestamp
    }

    /**
     * Get the data from the last report packet, unpacked according to the specification.
     * @category Data
     */
    get unpackedValue(): PackedValues {
        const d = this.data
        const fmt = this.specification?.packFormat
        try {
            return d && fmt && jdunpack(this.data, fmt)
        } catch (e) {
            console.error(e)
            return undefined
        }
    }

    /**
     * Gets the data from the last report packet, unpacked and hydrated into an object.
     * @category Data
     */
    get objectValue(): PackedObject {
        const { specification } = this
        return unpackedToObject(
            this.unpackedValue,
            specification?.fields,
            specification.name,
        )
    }

    /**
     * Gets the data as a signed integer
     * @category Data
     */
    get intValue(): number {
        const d = this.data
        return d && intOfBuffer(d)
    }

    /**
     * Gets the data as a unsigned integer
     * @category Data
     */
    get uintValue(): number {
        const d = this.data
        return d && uintOfBuffer(d)
    }

    /**
     * Gets the data as a boolean
     * @category Data
     */
    get boolValue(): boolean {
        if (this.data === undefined) return undefined
        return !!this.intValue
    }

    /**
     * Gets the data as a string
     * @category Data
     */
    get stringValue(): string {
        const buf = this.data
        if (buf === undefined) return undefined

        let value: string
        try {
            value = fromUTF8(uint8ArrayToString(buf))
        } catch {
            // invalid UTF8
            value = uint8ArrayToString(buf)
        }
        return value
    }

    /**
     * Gets a pretty printed represention of the data
     * @category Data
     */
    get humanValue(): string {
        return this.decoded?.decoded?.map(field => field.humanValue).join(",")
    }

    /**
     * @internal
     */
    toString() {
        const d = this.data
        return `${this.id} ${d ? toHex(d) : ""}`
    }

    /**
     * @internal
     */
    get decoded(): DecodedPacket {
        return this._lastReportPkt?.decoded
    }

    /**
     * Schedules to query the value for this register
     */
    scheduleRefresh() {
        if (this.notImplemented) return
        this._needsRefresh = true
    }

    get needsRefresh() {
        return this._needsRefresh
    }

    /**
     * Refresh the value of the register within a timeout
     * @param skipIfValue don't refresh if any data if available
     * @returns true if refresh OK, false if timeout or other error
     * @category Data
     */
    refresh(skipIfValue?: boolean): Promise<boolean> {
        // don't refetch not implemented
        if (this.notImplemented) return Promise.resolve(false)
        // don't refetch consts
        // don't refetch if already data
        if (!!this.data && (skipIfValue || isConstRegister(this.specification)))
            return Promise.resolve(true)

        const bus = this.service.device.bus
        return bus.withTimeout(
            REGISTER_REFRESH_TIMEOUT,
            new Promise<boolean>((resolve, reject) => {
                this.once(REPORT_RECEIVE, () => {
                    const f = resolve
                    resolve = null
                    f(true)
                })
                // re-send get if no answer within 40ms and 90ms
                this.sendGetAsync()
                    .then(() => bus.delay(REGISTER_REFRESH_RETRY_0))
                    .then(() => {
                        if (resolve)
                            return this.sendGetAsync().then(() =>
                                bus.delay(REGISTER_REFRESH_RETRY_1),
                            )
                    })
                    .then(() => {
                        if (resolve) return this.sendGetAsync()
                    })
                    .catch(e => reject(e))
            }),
        )
    }

    /**
     * @internal
     */
    processPacket(pkt: Packet) {
        if (this.notImplemented) return
        if (pkt.isRegisterGet) this.processReport(pkt)
        else if (pkt.isRegisterSet) {
            // another device sent a set packet to this register
            // so most likely it's value changed
            // clear any data caching to force updating the value
            this.clearGetTimestamp()
        }
    }

    setNotImplemented() {
        console.assert(
            !this._lastReportPkt,
            `register reported changed not implemented`,
            { register: this },
        )
        super.setNotImplemented()
    }

    private processReport(pkt: Packet) {
        const updated = !bufferEq(this.data, pkt.data) || this._needsRefresh
        this._lastReportPkt = pkt
        this._lastGetAttempts = 0 // reset counter
        this._lastGetTimestamp = this.service.device.bus.timestamp // reset time counter too
        this._needsRefresh = false
        this.emit(REPORT_RECEIVE, this)
        if (updated) {
            this.emitPropagated(REPORT_UPDATE, this)
            this.emit(CHANGE)
        }
    }

    /**
     * @internal
     */
    compareTo(b: JDRegister) {
        return this.code - b.code || this.service.compareTo(b.service)
    }
}

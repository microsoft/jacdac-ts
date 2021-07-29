import Packet from "./packet"
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
import { isRegister, isReading } from "./spec"
import { JDField } from "./field"
import { JDServiceMemberNode } from "./servicemembernode"
import { JDNode } from "./node"
import { jdpack, jdunpack, PackedValues } from "./pack"
import { PackedObject, unpackedToObject } from "./packobject"

export class JDRegister extends JDServiceMemberNode {
    private _lastReportPkt: Packet
    private _fields: JDField[]
    private _lastSetTimestamp = -Infinity
    private _lastGetTimestamp = -Infinity
    private _lastGetAttempts = 0

    constructor(service: JDService, code: number) {
        super(service, code, isRegister)
    }

    get nodeKind() {
        return REGISTER_NODE_NAME
    }

    get fields() {
        if (!this._fields)
            this._fields = this.specification?.fields.map(
                (field, index) => new JDField(this, index, field)
            )
        return this._fields.slice()
    }

    get children(): JDNode[] {
        return this.fields
    }

    get lastSetTimestamp() {
        return this._lastSetTimestamp
    }

    get lastGetTimestamp() {
        return this._lastGetTimestamp
    }

    clearGetTimestamp() {
        this._lastGetTimestamp = -Infinity
    }

    get lastGetAttempts() {
        return this._lastGetAttempts
    }

    // send a message to set the register value
    sendSetAsync(data: Uint8Array, autoRefresh?: boolean): Promise<void> {
        const cmd = CMD_SET_REG | this.code
        const pkt = Packet.from(cmd, data)
        this._lastSetTimestamp = this.service.device.bus.timestamp
        let p = this.service.sendPacketAsync(pkt, this.service.registersUseAcks)
        if (autoRefresh)
            p = this.service.device.bus
                .delay(50)
                .then(() => this.sendGetAsync())
        return p
    }

    sendGetAsync(): Promise<void> {
        if (this.specification?.kind === "const" && this.data !== undefined)
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

    sendSetPackedAsync(
        fmt: string,
        values: PackedValues,
        autoRefresh?: boolean
    ): Promise<void> {
        return this.sendSetAsync(jdpack(fmt, values), autoRefresh)
    }

    sendSetIntAsync(value: number, autoRefresh?: boolean): Promise<void> {
        return this.sendSetPackedAsync("i32", [value >> 0], autoRefresh)
    }

    sendSetBoolAsync(value: boolean, autoRefresh?: boolean): Promise<void> {
        return this.sendSetPackedAsync("u8", [value ? 1 : 0], autoRefresh)
    }

    sendSetStringAsync(value: string, autoRefresh?: boolean): Promise<void> {
        return this.sendSetPackedAsync("s", [value || ""], autoRefresh)
    }

    get isReading() {
        return this.specification && isReading(this.specification)
    }

    get data() {
        return this._lastReportPkt?.data
    }

    get lastDataTimestamp() {
        return this._lastReportPkt?.timestamp
    }

    get unpackedValue(): PackedValues {
        const d = this.data
        const fmt = this.specification?.packFormat
        return d && fmt && jdunpack(this.data, fmt)
    }

    get objectValue(): PackedObject {
        const { specification } = this
        return unpackedToObject(
            this.unpackedValue,
            specification?.fields,
            specification.name
        )
    }

    get intValue(): number {
        const d = this.data
        return d && intOfBuffer(d)
    }

    get uintValue(): number {
        const d = this.data
        return d && uintOfBuffer(d)
    }

    get boolValue(): boolean {
        if (this.data === undefined) return undefined
        return !!this.intValue
    }

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

    get humanValue(): string {
        return this.decoded?.decoded?.map(field => field.humanValue).join(",")
    }

    toString() {
        const d = this.data
        return `${this.id} ${d ? toHex(d) : ""}`
    }

    get decoded(): DecodedPacket {
        return this._lastReportPkt?.decoded
    }

    refresh(skipIfValue?: boolean): Promise<void> {
        // don't refetch consts
        // don't refetch if already data
        if (
            !!this.data &&
            (skipIfValue || this.specification?.kind === "const")
        )
            return

        const bus = this.service.device.bus
        return bus.withTimeout(
            REGISTER_REFRESH_TIMEOUT,
            new Promise<void>((resolve, reject) => {
                this.once(REPORT_RECEIVE, () => {
                    const f = resolve
                    resolve = null
                    f()
                })
                // re-send get if no answer within 40ms and 90ms
                this.sendGetAsync()
                    .then(() => bus.delay(REGISTER_REFRESH_RETRY_0))
                    .then(() => {
                        if (resolve)
                            return this.sendGetAsync().then(() =>
                                bus.delay(REGISTER_REFRESH_RETRY_1)
                            )
                    })
                    .then(() => {
                        if (resolve) return this.sendGetAsync()
                    })
                    .catch(e => reject(e))
            })
        )
    }

    processPacket(pkt: Packet) {
        if (pkt.isRegisterGet) this.processReport(pkt)
        else if (pkt.isRegisterSet) {
            // another device sent a set packet to this register
            // so most likely it's value changed
            // clear any data caching to force updating the value
            this.clearGetTimestamp()
        }
    }

    private processReport(pkt: Packet) {
        const updated = !bufferEq(this.data, pkt.data)
        this._lastReportPkt = pkt
        this._lastGetAttempts = 0 // reset counter
        this._lastGetTimestamp = this.service.device.bus.timestamp // reset time counter too
        this.emit(REPORT_RECEIVE, this)
        if (updated) {
            this.emitPropagated(REPORT_UPDATE, this)
            this.emit(CHANGE)
        }
    }

    compareTo(b: JDRegister) {
        return this.code - b.code || this.service.compareTo(b.service)
    }
}

export function stableSortRegisters(registers: JDRegister[]): JDRegister[] {
    return registers?.sort((a, b) => a.compareTo(b))
}

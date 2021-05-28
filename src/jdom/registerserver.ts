import JDServiceServer from "./serviceserver"
import { jdpack, jdunpack, PackedSimpleValue, PackedValues } from "./pack"
import Packet from "./packet"
import { bufferEq, isSet, pick } from "./utils"
import { JDEventSource } from "./eventsource"
import {
    CHANGE,
    CMD_GET_REG,
    PACKET_DATA_NORMALIZE,
    PACKET_INVALID_DATA,
    REGISTER_PRE_GET,
    REPORT_RECEIVE,
} from "./constants"
import { isRegister } from "./spec"

function defaultFieldPayload(
    specification: jdspec.PacketMember
): PackedSimpleValue {
    let r: PackedSimpleValue = undefined
    switch (specification.type) {
        case "bool":
            r = 0
            break
        case "i8":
        case "i16":
        case "i32":
        case "u8":
        case "u16":
        case "u32": {
            const min = pick(
                specification.typicalMin,
                specification.absoluteMin,
                undefined
            )
            const max = pick(
                specification.typicalMax,
                specification.absoluteMax,
                undefined
            )
            if (max !== undefined && min !== undefined) r = (max + min) / 2
            else r = 0
            break
        }
        case "bytes": {
            r = new Uint8Array(0)
            break
        }
        case "string":
        case "string0": {
            r = ""
            break
        }
    }

    if (/^(u0|i1)\.\d+$/.test(specification.type)) r = 0

    return r
}

function defaultPayload<T extends PackedValues>(
    specification: jdspec.PacketInfo
): T {
    const { fields } = specification
    const rs = fields.map(defaultFieldPayload)
    return rs as T
}

export default class JDRegisterServer<
    TValues extends PackedValues
> extends JDEventSource {
    data: Uint8Array
    lastSetTime: number
    private readonly resetData: Uint8Array
    readonly specification: jdspec.PacketInfo
    readOnly: boolean
    errorRegister: JDRegisterServer<TValues>
    skipBoundaryCheck = false
    skipErrorInjection = false

    constructor(
        public readonly service: JDServiceServer,
        public readonly identifier: number,
        defaultValue?: TValues
    ) {
        super()
        const serviceSpecification = this.service.specification
        this.specification = serviceSpecification.packets.find(
            pkt => isRegister(pkt) && pkt.identifier === this.identifier
        )
        let v: PackedValues = defaultValue
        if (!v && !this.specification.optional)
            v = defaultPayload(this.specification)
        if (v !== undefined && !v.some(vi => vi === undefined)) {
            this.data = jdpack(this.packFormat, v)
        }

        // keep a copy to handle reset
        this.resetData = this.data?.slice(0)

        // don't check boundaries if there are none
        this.skipBoundaryCheck = !this.specification?.fields.some(
            field => isSet(field.absoluteMin) || isSet(field.absoluteMax)
        )
    }

    get packFormat() {
        return this.specification.packFormat
    }

    values(): TValues {
        return jdunpack(this.data, this.packFormat) as TValues
    }

    private normalize(values: TValues) {
        // enforce boundaries from spec
        if (!this.skipBoundaryCheck) {
            this.specification?.fields.forEach((field, fieldi) => {
                if (field.isSimpleType) {
                    let value = values[fieldi] as number
                    // clamp within bounds
                    const min = field.absoluteMin
                    if (min !== undefined) value = Math.max(min, value)
                    const max = field.absoluteMax
                    if (max !== undefined) value = Math.min(max, value)
                    // update
                    values[fieldi] = value
                }
            })
        }

        // enforce other boundaries
        this.emit(PACKET_DATA_NORMALIZE, values)
    }

    private shouldNormalize() {
        return (
            !this.skipBoundaryCheck || this.listenerCount(PACKET_DATA_NORMALIZE)
        )
    }

    setValues(values: TValues, skipChangeEvent?: boolean) {
        if (this.readOnly) return

        if (this.shouldNormalize()) this.normalize(values)
        const d = jdpack(this.packFormat, values)
        if (!bufferEq(this.data, d)) {
            this.data = d
            if (!skipChangeEvent) this.emit(CHANGE)
        }
    }

    reset() {
        this.data = this.resetData?.slice(0)
    }

    async sendGetAsync() {
        this.emit(REGISTER_PRE_GET)

        let d = this.data
        if (!d) return

        const error =
            !this.skipErrorInjection && this.errorRegister?.values()[0]
        if (error && !isNaN(error)) {
            // apply error artifically
            const vs = this.values() as number[]
            for (let i = 0; i < vs.length; ++i) {
                vs[i] += Math.random() * error
            }
            d = jdpack(this.packFormat, vs)
        }
        await this.service.sendPacketAsync(
            Packet.from(this.identifier | CMD_GET_REG, d)
        )
    }

    handlePacket(pkt: Packet): boolean {
        if (this.identifier !== pkt.registerIdentifier) return false

        if (pkt.isRegisterGet) {
            this.sendGetAsync()
        } else if (this.identifier >> 8 !== 0x1) {
            // set, non-const
            let changed = false
            let d = pkt.data

            // unpack and check boundaries
            if (this.shouldNormalize()) {
                try {
                    // unpack, apply boundaries, repack
                    const values = jdunpack<TValues>(d, this.packFormat)
                    this.normalize(values)
                    d = jdpack<TValues>(this.packFormat, values)
                } catch (e) {
                    // invalid format, refuse
                    this.emit(PACKET_INVALID_DATA, pkt)
                }
            }

            // test if anything changed
            if (!bufferEq(this.data, d)) {
                this.data = d
                changed = true
            }
            this.lastSetTime = this.service.device.bus.timestamp
            this.emit(REPORT_RECEIVE)
            if (changed) this.emit(CHANGE)
        }
        return true
    }
}

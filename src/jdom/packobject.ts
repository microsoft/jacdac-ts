import { jdpack, PackedSimpleValue, PackedValues } from "./pack"

export interface PackedObject {
    [index: string]: PackedSimpleValue | PackedObject | PackedObject[]
}

/**
 * Unrolls an array of packed values into a friendly object structure
 * @param data
 * @param fields
 * @returns
 */
export function unpackedToObject(
    data: PackedValues,
    fields: jdspec.PacketMember[],
    defaultName?: string
): PackedObject {
    if (!data || !fields) return undefined
    const r: PackedObject = {}
    for (let i = 0; i < data.length; ++i) {
        const field = fields[i]
        const value = data[i]
        const { name, startRepeats } = field
        const prettyName = name === "_" && defaultName ? defaultName : name

        if (startRepeats) {
            const repeatData = data.slice(i)
            const repeatFields = fields.slice(i)
            r["repeat"] = repeatData.map(rdata =>
                unpackedToObject(rdata, repeatFields)
            )
            break
        } else r[prettyName] = value
    }
    return r
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function objectToPacked(pkt: jdspec.PacketInfo, msg: any): Uint8Array {
    if (!msg) return new Uint8Array(0)

    const { fields } = pkt
    const r: PackedValues = []
    for (let i = 0; i < fields.length; ++i) {
        const field = fields[i]
        const value = msg[field.name]
        if (field.startRepeats) {
            const repeatFields = fields.slice(i)
            r.push(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (value as any[]).map(vrow => {
                    const arow: PackedSimpleValue[] = []
                    for (let j = 0; j < repeatFields.length; ++j) {
                        const rfield = repeatFields[j]
                        arow.push(vrow[rfield.name])
                    }
                    return arow
                })
            )
            break
        } else {
            r.push(value)
        }
    }
    return jdpack(pkt.packFormat, r)
}

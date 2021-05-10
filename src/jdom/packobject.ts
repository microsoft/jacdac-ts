import { PackedSimpleValue, PackedValues } from "./pack"

export interface PackedObject {
    [index: string]: PackedSimpleValue | PackedObject | PackedObject[]
    repeat?: PackedObject[]
}

/**
 * Unrolls an array of packed values into a friendly object structure
 * @param data
 * @param fields
 * @returns
 */
export function unpackedToObject(
    data: PackedValues,
    fields: jdspec.PacketMember[]
): PackedObject {
    if (!data || !fields) return undefined
    const r: PackedObject = {}
    for (let i = 0; i < data.length; ++i) {
        const field = fields[i]
        const value = data[i]
        const { name, startRepeats } = field

        if (startRepeats) {
            const repeatData = data.slice(i)
            const repeatFields = fields.slice(i)
            r.repeat = repeatData.map(rdata =>
                unpackedToObject(rdata, repeatFields)
            )
            break
        } else r[name] = value
    }
    return r
}

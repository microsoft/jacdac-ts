import { PackedSimpleValue, PackedValues } from "./pack"

/**
 * Unpacked data mapped as an object
 * @category Data Packing
 */
export interface PackedObject {
    [index: string]: PackedSimpleValue | PackedObject | PackedObject[]
}

/**
 * Unrolls an array of packed values into a friendly object structure
 * @param data
 * @param fields
 * @returns
 * @category Data Packing
 */
export function unpackedToObject(
    data: PackedValues,
    fields: jdspec.PacketMember[],
    defaultName?: string,
): PackedObject {
    if (!data || !fields) return undefined
    const r: PackedObject = {}
    for (let i = 0; i < data.length; ++i) {
        const field = fields[i]
        const value = data[i]
        const { name, startRepeats } = field
        const prettyName = name === "_" && defaultName ? defaultName : name

        if (startRepeats) {
            const repeatFields = fields.slice(i)
            //console.log({ value, repeatFields, data })
            r["repeat"] = value.map((rdata: PackedValues) => {
                const r: PackedObject = {}
                for (let i = 0; i < repeatFields.length; ++i) {
                    const field = fields[i]
                    const value = rdata[i]
                    const { name } = field
                    const prettyName =
                        name === "_" && defaultName ? defaultName : name
                    r[prettyName] = value
                }
                return r
            })
            break
        } else r[prettyName] = value
    }
    return r
}

/**
 * Converts an object structure into a flat packed data array
 * @param pkt
 * @param msg
 * @returns
 * @category Data Packing
 */
export function objectToUnpacked(
    pkt: jdspec.PacketInfo,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    msg: any,
): PackedValues {
    if (!msg) return []

    if (typeof msg === "number" || typeof msg === "string")
        return [msg as number]
    else if (typeof msg === "boolean") return [msg ? 1 : 0]
    else if (Array.isArray(msg)) {
        // assume a packaged layout
        return msg as PackedValues
    } else {
        const { fields } = pkt
        const r: PackedValues = []
        for (let i = 0; i < fields.length; ++i) {
            const field = fields[i]
            const name = field.name === "_" ? pkt.name : field.name
            const value = msg[name]
            if (field.startRepeats) {
                const repeatFields = fields.slice(i)
                r.push(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (value as any[]).map(vrow => {
                        const arow: PackedSimpleValue[] = []
                        for (let j = 0; j < repeatFields.length; ++j) {
                            const rfield = repeatFields[j]
                            const rname = rfield.name
                            arow.push(vrow[rname])
                        }
                        return arow
                    }),
                )
                break
            } else {
                r.push(value)
            }
        }

        return r
    }
}

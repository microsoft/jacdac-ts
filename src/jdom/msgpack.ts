import { NumberFormat, getNumber, sizeOfNumberFormat, setNumber } from "./buffer"

// see http://msgpack.org/ for the spec
// it currently only implements numbers and their sequances


// once we handle any type and typeof expressions we can do more
function tagFormat(tag: number) {
    switch (tag) {
        case 0xCB: return NumberFormat.Float64BE
        case 0xCC: return NumberFormat.UInt8BE
        case 0xCD: return NumberFormat.UInt16BE
        case 0xCE: return NumberFormat.UInt32BE
        case 0xD0: return NumberFormat.Int8BE
        case 0xD1: return NumberFormat.Int16BE
        case 0xD2: return NumberFormat.Int32BE
        default:
            return null
    }
}

function packNumberCore(buf: Uint8Array, offset: number, num: number) {
    let tag = 0xCB
    if (num == (num << 0) || num == (num >>> 0)) {
        if (-31 <= num && num <= 127) {
            if (buf) buf[offset] = num
            return 1
        } else if (0 <= num) {
            if (num <= 0xff) {
                tag = 0xCC
            } else if (num <= 0xffff) {
                tag = 0xCD
            } else {
                tag = 0xCE
            }
        } else {
            if (-0x7f <= num) {
                tag = 0xD0
            } else if (-0x7fff <= num) {
                tag = 0xD1
            } else {
                tag = 0xD2
            }
        }
    }
    const fmt = tagFormat(tag)
    if (buf) {
        buf[offset] = tag
        setNumber(buf, fmt, offset + 1, num)
    }
    return sizeOfNumberFormat(fmt) + 1
}

/**
 * Unpacks a buffer into a number array.
 */
export function unpackNumberArray(buf: Uint8Array, offset = 0): number[] {
    const res: number[] = []

    while (offset < buf.length) {
        const fmt = tagFormat(buf[offset++])
        if (fmt === null) {
            const v = getNumber(buf, NumberFormat.Int8BE, offset - 1)
            if (-31 <= v && v <= 127)
                res.push(v)
            else
                return null
        } else {
            res.push(getNumber(buf, fmt, offset))
            offset += sizeOfNumberFormat(fmt)
        }
        // padding at the end
        while (buf[offset] === 0xc1) offset++;
    }

    return res
}

/**
 * Pack a number array into a buffer.
 * @param nums the numbers to be packed
 */
export function packNumberArray(nums: number[]): Uint8Array {
    let off = 0
    for (const n of nums) {
        off += packNumberCore(null, off, n)
    }
    const buf = new Uint8Array(off)
    off = 0
    for (const n of nums) {
        off += packNumberCore(buf, off, n)
    }
    return buf
}

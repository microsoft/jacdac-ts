import { read16, read32 } from "./utils";

export enum NumberFormat {
    Int8LE = 1,
    UInt8LE = 2,
    Int16LE = 3,
    UInt16LE = 4,
    Int32LE = 5,
    Int8BE = 6,
    UInt8BE = 7,
    Int16BE = 8,
    UInt16BE = 9,
    Int32BE = 10,
    UInt32LE = 11,
    UInt32BE = 12,
    Float32LE = 13,
    Float64LE = 14,
    Float32BE = 15,
    Float64BE = 16,
    UInt64LE = 17,
    UInt64BE = 18,
    Int64LE = 19,
    Int64BE = 20,
}

function fmtInfoCore(fmt: NumberFormat) {
    switch (fmt) {
        case NumberFormat.Int8LE: return -1;
        case NumberFormat.UInt8LE: return 1;
        case NumberFormat.Int16LE: return -2;
        case NumberFormat.UInt16LE: return 2;
        case NumberFormat.Int32LE: return -4;
        case NumberFormat.UInt32LE: return 4;
        case NumberFormat.Int64LE: return -8;
        case NumberFormat.UInt64LE: return 8;
        case NumberFormat.Int8BE: return -10;
        case NumberFormat.UInt8BE: return 10;
        case NumberFormat.Int16BE: return -20;
        case NumberFormat.UInt16BE: return 20;
        case NumberFormat.Int32BE: return -40;
        case NumberFormat.UInt32BE: return 40;
        case NumberFormat.Int64BE: return -80;
        case NumberFormat.UInt64BE: return 80;

        case NumberFormat.Float32LE: return 4;
        case NumberFormat.Float32BE: return 40;
        case NumberFormat.Float64LE: return 8;
        case NumberFormat.Float64BE: return 80;
        default: throw new Error("unknown format");
    }
}

function fmtInfo(fmt: NumberFormat) {
    let size = fmtInfoCore(fmt)
    let signed = false
    if (size < 0) {
        signed = true
        size = -size
    }
    let swap = false
    if (size >= 10) {
        swap = true
        size /= 10
    }
    let isFloat = false
    switch (fmt) {
        case NumberFormat.Float32LE:
        case NumberFormat.Float32BE:
        case NumberFormat.Float64LE:
        case NumberFormat.Float64BE:
            isFloat = true
            break
    }
    return { size, signed, swap, isFloat }
}

/**
 * Get the size in bytes of specified number format.
 */
export function sizeOfNumberFormat(format: NumberFormat) {
    switch (format) {
        case NumberFormat.Int8LE:
        case NumberFormat.UInt8LE:
        case NumberFormat.Int8BE:
        case NumberFormat.UInt8BE:
            return 1;
        case NumberFormat.Int16LE:
        case NumberFormat.UInt16LE:
        case NumberFormat.Int16BE:
        case NumberFormat.UInt16BE:
            return 2;
        case NumberFormat.Int32LE:
        case NumberFormat.Int32BE:
        case NumberFormat.UInt32BE:
        case NumberFormat.UInt32LE:
        case NumberFormat.Float32BE:
        case NumberFormat.Float32LE:
            return 4;
        case NumberFormat.UInt64BE:
        case NumberFormat.Int64BE:
        case NumberFormat.UInt64LE:
        case NumberFormat.Int64LE:
        case NumberFormat.Float64BE:
        case NumberFormat.Float64LE:
            return 8;
    }
    return 0;
}

export function getNumber(buf: ArrayLike<number>, fmt: NumberFormat, offset: number) {
    switch (fmt) {
        case NumberFormat.UInt8BE:
        case NumberFormat.UInt8LE:
            return buf[offset]
        case NumberFormat.Int8BE:
        case NumberFormat.Int8LE:
            return (buf[offset] << 24) >> 24
        case NumberFormat.UInt16LE:
            return read16(buf, offset)
        case NumberFormat.Int16LE:
            return (read16(buf, offset) << 16) >> 16
        case NumberFormat.UInt32LE:
            return read32(buf, offset)
        case NumberFormat.Int32LE:
            return read32(buf, offset) >> 0
        case NumberFormat.UInt64LE:
            return read32(buf, offset) + read32(buf, offset + 4) * 0x100000000
        case NumberFormat.Int64LE:
            return read32(buf, offset) + (read32(buf, offset + 4) >> 0) * 0x100000000
        default:
            const inf = fmtInfo(fmt)
            if (inf.isFloat) {
                const arr = new Uint8Array(inf.size)
                for (let i = 0; i < inf.size; ++i) {
                    arr[i] = buf[offset + i]
                }
                if (inf.swap)
                    arr.reverse()
                if (inf.size == 4)
                    return new Float32Array(arr.buffer)[0]
                else
                    return new Float64Array(arr.buffer)[0]
            }
            throw new Error("unsupported fmt:" + fmt)
    }
}

export function setNumber(buf: Uint8Array, fmt: NumberFormat, offset: number, r: number) {
    const inf = fmtInfo(fmt)
    if (inf.isFloat) {
        const arr = new Uint8Array(inf.size)
        if (inf.size == 4)
            new Float32Array(arr.buffer)[0] = r
        else
            new Float64Array(arr.buffer)[0] = r
        if (inf.swap)
            arr.reverse()
        for (let i = 0; i < inf.size; ++i) {
            buf[offset + i] = arr[i]
        }
        return
    }

    for (let i = 0; i < inf.size; ++i) {
        const off = !inf.swap ? offset + i : offset + inf.size - i - 1
        buf[off] = (r & 0xff)
        r >>= 8
    }
}

export function intOfBuffer(data: Uint8Array) {
    let fmt: NumberFormat
    switch (data.length) {
        case 0:
        case 1:
            fmt = NumberFormat.Int8LE
            break
        case 2:
        case 3:
            fmt = NumberFormat.Int16LE
            break
        default:
            fmt = NumberFormat.Int32LE
            break
    }
    return getNumber(data, fmt, 0)
}

export function bufferToArray(data: Uint8Array, fmt: NumberFormat) {
    const res: number[] = []
    const sz = sizeOfNumberFormat(fmt)
    for (let off = 0; off <= data.length - sz; off += sz)
        res.push(getNumber(data, fmt, off))
    return res
}

export function concatBufferArray(chunks: Uint8Array[]) {
    let sz = 0
    for (const ch of chunks) sz += ch.length
    const r = new Uint8Array(sz)
    sz = 0
    for (const ch of chunks) {
        r.set(ch, sz)
        sz += ch.length
    }
    return r
}

// Python-like packing, see https://docs.python.org/3/library/struct.html

import { NumberFormat, setNumber, getNumber, sizeOfNumberFormat } from "./buffer"

export function packedSize(format: string) {
    return packUnpackCore(format, null, null, true)
}

export function pack(format: string, nums: number[]) {
    let buf = new Uint8Array(packedSize(format))
    packUnpackCore(format, nums, buf, true)
    return buf
}


function getFormat(pychar: string, isBig: boolean) {
    switch (pychar) {
        case 'B':
            return NumberFormat.UInt8LE
        case 'b':
            return NumberFormat.Int8LE
        case 'H':
            return isBig ? NumberFormat.UInt16BE : NumberFormat.UInt16LE
        case 'h':
            return isBig ? NumberFormat.Int16BE : NumberFormat.Int16LE
        case 'I':
        case 'L':
            return isBig ? NumberFormat.UInt32BE : NumberFormat.UInt32LE
        case 'i':
        case 'l':
            return isBig ? NumberFormat.Int32BE : NumberFormat.Int32LE
        case 'f':
            return isBig ? NumberFormat.Float32BE : NumberFormat.Float32LE
        case 'd':
            return isBig ? NumberFormat.Float64BE : NumberFormat.Float64LE
        default:
            return null as NumberFormat
    }
}

function isDigit(ch: string) {
    const code = ch.charCodeAt(0)
    return 0x30 <= code && code <= 0x39
}

function packUnpackCore(format: string, nums: number[], buf: Uint8Array, isPack: boolean, off = 0) {
    let isBig = false
    let idx = 0
    for (let i = 0; i < format.length; ++i) {
        switch (format[i]) {
            case ' ':
            case '<':
            case '=':
                isBig = false
                break
            case '>':
            case '!':
                isBig = true
                break
            case 'x':
                off++
                break
            default:
                const i0 = i
                while (isDigit(format[i])) i++
                let reps = 1
                if (i0 != i)
                    reps = parseInt(format.slice(i0, i))
                while (reps--) {
                    let fmt = getFormat(format[i], isBig)
                    if (fmt === null) {
                        throw new Error("Unsupported format character: " + format[i])
                    } else {
                        if (buf) {
                            if (isPack)
                                setNumber(buf, fmt, off, nums[idx++])
                            else
                                nums.push(getNumber(buf, fmt, off))
                        }

                        off += sizeOfNumberFormat(fmt)
                    }
                }
                break
        }
    }
    return off
}

export function bufferOfInt(value: number): Uint8Array {
    return pack("i", [value | 0])
}

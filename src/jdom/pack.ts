import { getNumber, NumberFormat, setNumber, sizeOfNumberFormat } from "./buffer"
import { bufferToString, stringToBuffer } from "./utils"

const ch_b = 98
const ch_i = 105
const ch_r = 114
const ch_s = 115
const ch_u = 117
const ch_x = 120
const ch_z = 122
const ch_0 = 48
const ch_9 = 57
const ch_colon = 58

function numberFormatOfType(tp: string): NumberFormat {
    switch (tp) {
        case "u8": return NumberFormat.UInt8LE
        case "u16": return NumberFormat.UInt16LE
        case "u32": return NumberFormat.UInt32LE
        case "i8": return NumberFormat.Int8LE
        case "i16": return NumberFormat.Int16LE
        case "i32": return NumberFormat.Int32LE
        default: return null
    }
}

function bufferSlice(buf: Uint8Array, start: number, end: number) {
    return buf.slice(start, end)
}

class TokenParser {
    c0: number
    size: number
    div: number
    fp = 0
    nfmt: NumberFormat
    word: string

    constructor(public fmt: string) { }

    parse() {
        this.div = 1

        const fmt = this.fmt
        while (this.fp < fmt.length) {
            let endp = this.fp
            while (endp < fmt.length && fmt.charCodeAt(endp) != 32)
                endp++
            let word = fmt.slice(this.fp, endp)
            this.fp = endp + 1
            if (!word)
                continue

            const dotIdx = word.indexOf(".")
            let c0 = word.charCodeAt(0)
            // "u10.6" -> "u16", div = 1 << 6
            if ((c0 == ch_i || c0 == ch_u) && dotIdx >= 0) {
                const sz0 = parseInt(word.slice(1, dotIdx))
                const sz1 = parseInt(word.slice(dotIdx + 1))
                word = word[0] + (sz0 + sz1)
                this.div = 1 << sz1
            }

            const c1 = word.charCodeAt(1)
            if (ch_0 <= c1 && c1 <= ch_9) {
                this.size = parseInt(word.slice(1))
            } else {
                this.size = -1
            }

            this.nfmt = numberFormatOfType(word)
            this.word = word

            if (this.nfmt == null) {
                if (c0 == ch_r) {
                    if (c1 != ch_colon)
                        c0 = 0
                } else if (c0 == ch_s || c0 == ch_b || c0 == ch_x) {
                    if (word.length != 1 && this.size == -1)
                        c0 = 0
                } else if (c0 == ch_z) {
                    if (word.length != 1)
                        c0 = 0
                } else {
                    c0 = 0
                }
                if (c0 == 0)
                    throw new Error(`invalid format: ${word}`)
                this.c0 = c0
            } else {
                this.size = sizeOfNumberFormat(this.nfmt)
                this.c0 = -1
            }

            return true
        }
        return false
    }
}

function jdunpackCore(buf: Uint8Array, fmt: string, repeat: boolean) {
    const repeatRes: any[][] = repeat ? [] : null
    let res: any[] = []
    let off = 0
    const parser = new TokenParser(fmt)
    while (parser.parse()) {
        let sz = parser.size
        const c0 = parser.c0
        if (c0 == ch_z) {
            let endoff = off
            while (endoff < buf.length && buf[endoff] != 0)
                endoff++
            sz = endoff - off
        } else if (sz < 0) {
            sz = buf.length - off
        }

        if (parser.nfmt !== null) {
            let v = getNumber(buf, parser.nfmt, off)
            if (parser.div != 1) v /= parser.div
            res.push(v)
            off += parser.size
        } else {
            const subbuf = bufferSlice(buf, off, off + sz)
            if (c0 == ch_z || c0 == ch_s) {
                let zerop = 0
                while (zerop < subbuf.length && subbuf[zerop] != 0)
                    zerop++
                res.push(bufferToString(bufferSlice(subbuf, 0, zerop)))
            } else if (c0 == ch_b) {
                res.push(subbuf)
            } else if (c0 == ch_x) {
                // skip padding
            } else if (c0 == ch_r) {
                res.push(jdunpackCore(subbuf, fmt.slice(parser.fp), true))
            } else {
                throw new Error(`whoops`)
            }
            off += subbuf.length
            if (c0 == ch_z)
                off++
        }

        if (off >= buf.length)
            break

        if (repeat && parser.fp >= fmt.length) {
            parser.fp = 0
            repeatRes.push(res)
            res = []
        }
    }

    if (repeat) {
        if (res.length)
            repeatRes.push(res)
        return repeatRes
    } else {
        return res
    }
}

export function jdunpack(buf: Uint8Array, fmt: string) {
    return jdunpackCore(buf, fmt, false)
}

function jdpackCore(trg: Uint8Array, fmt: string, data: any[], off: number) {
    let idx = 0
    const parser = new TokenParser(fmt)
    while (parser.parse()) {
        const c0 = parser.c0
        const v = data[idx++]

        if (c0 == ch_r) {
            const fmt0 = fmt.slice(parser.fp)
            for (const velt of (v as any[][])) {
                off = jdpackCore(trg, fmt0, velt, off)
            }
            break
        }

        if (parser.nfmt !== null) {
            if (typeof v != "number")
                throw new Error(`expecting number`)
            if (trg)
                setNumber(trg, parser.nfmt, off, (v * parser.div) | 0)
            off += parser.size
        } else {
            let buf: Uint8Array
            if (typeof v == "string") {
                if (c0 == ch_z)
                    buf = stringToBuffer(v + "\u0000")
                else if (c0 == ch_s)
                    buf = stringToBuffer(v)
                else
                    throw new Error(`unexpected string`)
            } else if (v && typeof v == "object" && v.length != null) {
                // assume buffer
                if (c0 == ch_b)
                    buf = v
                else
                    throw new Error(`unexpected buffer`)
            } else {
                throw new Error(`expecting string or buffer`)
            }

            let sz = parser.size
            if (sz >= 0) {
                if (buf.length > sz)
                    buf = bufferSlice(buf, 0, sz)
            } else {
                sz = buf.length
            }

            if (trg)
                trg.set(buf, off)
            off += sz
        }
    }

    if (data.length > idx)
        throw new Error(`format too short`)

    return off
}

export function jdpack<T extends any[]>(fmt: string, data: T) {
    const len = jdpackCore(null, fmt, data, 0)
    const res = new Uint8Array(len)
    jdpackCore(res, fmt, data, 0)
    return res
}

/*
export function jdpackTest() {
    function testOne(fmt: string, data0: any[]) {
        function checksame(a: any, b: any) {
            function fail(msg: string): never {
                debugger
                throw new Error(`jdpack test error: ${msg} (at ${fmt}; a=${JSON.stringify(a)}; b=${JSON.stringify(b)})`)
            }

            if (a === b)
                return
            if (a instanceof Uint8Array && b instanceof Uint8Array && bufferEq(a, b))
                return
            if (Array.isArray(a)) {
                if (!Array.isArray(b))
                    fail("not array")
                if (a.length != b.length)
                    fail("different length")
                for (let i = 0; i < a.length; ++i)
                    checksame(a[i], b[i])
                return
            }
            fail("not the same")
        }

        const buf = jdpack(fmt, data0)
        const data1 = jdunpack(buf, fmt)
        console.log(fmt, data0, data1, toHex(buf))
        checksame(data0, data1)
    }

    testOne("u16 u16 i16", [42, 77, -10])
    testOne("u16 z s", [42, "foo", "bar"])
    testOne("u32 z s", [42, "foo", "bar"])
    testOne("i8 z s", [42, "foo", "bar"])
    testOne("u8 z s", [42, "foo12", "bar"])
    testOne("u8 r: u8 z", [42, [[17, "xy"], [18, "xx"]]])
    testOne("z b", ["foo12", stringToBuffer("bar")])
    testOne("u16 r: u16", [42, [[17], [18]]])
    testOne("i8 s9 u16 s10 u8", [-100, "foo", 1000, "barbaz", 250])
}

 jdpackTest()
*/
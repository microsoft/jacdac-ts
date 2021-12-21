import {
    fromUTF8,
    range,
    read16,
    read32,
    stringToUint8Array,
    toUTF8,
    uint8ArrayToString,
    write16,
    write32,
} from "../jdom/utils"
import {
    BinFmt,
    bitSize,
    CellKind,
    InstrArgResolver,
    isPrefixInstr,
    NUM_REGS,
    OpAsync,
    OpBinary,
    OpFmt,
    OpSync,
    OpTop,
    OpUnary,
    SMap,
    stringifyCellKind,
    stringifyInstr,
    ValueSpecial,
} from "./format"

function oops(pos: number, msg: string): never {
    throw new Error(`verification error at ${hex(pos)}: ${msg}`)
}

function assert(pos: number, cond: boolean, msg: string) {
    if (!cond) oops(pos, msg)
}

function hex(n: number) {
    return "0x" + n.toString(16)
}

class BinSection {
    constructor(public buf: Uint8Array, public offset: number) {
        assert(offset, (offset & 3) == 0, "binsect: offset aligned")
        assert(offset, this.end <= this.buf.length, "binsect: end <= len")
    }

    toString() {
        return `[${hex(this.start)}:${hex(this.end)}]`
    }

    get start() {
        return read32(this.buf, this.offset)
    }

    get end() {
        return this.start + this.length
    }

    get length() {
        return read32(this.buf, this.offset + 4)
    }

    asBuffer() {
        return this.buf.slice(this.start, this.end)
    }

    mustContain(pos: number, off: number | BinSection) {
        if (typeof off == "number") {
            if (this.start <= off && off <= this.end) return
            oops(pos, `${hex(off)} falls outside of ${this}`)
        } else {
            this.mustContain(pos, off.start)
            this.mustContain(pos, off.end)
        }
    }
}

export function verifyBinary(bin: Uint8Array) {
    const hd = bin.slice(0, BinFmt.FixHeaderSize)
    assert(0, read32(hd, 0) == BinFmt.Magic0, "magic 0")
    assert(4, read32(hd, 4) == BinFmt.Magic1, "magic 1")
    const sects = range(5).map(
        idx =>
            new BinSection(
                bin,
                BinFmt.FixHeaderSize + BinFmt.SectionHeaderSize * idx
            )
    )
    for (let i = 0; i < sects.length; ++i) {
        console.log(`sect ${sects[i]}`)
        if (i > 0)
            assert(
                sects[i].offset,
                sects[i - 1].end == sects[i].start,
                "section in order"
            )
    }
    const [funDesc, funData, floatData, strDesc, strData] = sects

    let prevProc = funData.start
    for (
        let ptr = funDesc.start;
        ptr < funDesc.end;
        ptr += BinFmt.FunctionHeaderSize
    ) {
        const funSect = new BinSection(bin, ptr)
        assert(ptr, funSect.start == prevProc, "func in order")
        funData.mustContain(ptr, funSect)
        prevProc = funSect.end
        verifyFunction(ptr, funSect)
    }

    let idx = 0
    for (
        let ptr = strDesc.start;
        ptr < strDesc.end;
        ptr += BinFmt.SectionHeaderSize
    ) {
        const strSect = new BinSection(bin, ptr)
        strData.mustContain(ptr, strSect)
        const str = fromUTF8(uint8ArrayToString(strSect.asBuffer()))
        console.log(`str #${idx++} = ${JSON.stringify(str)}`)
    }

    function verifyFunction(hd: number, f: BinSection) {
        assert(hd, f.length > 0, "func size > 0")
        console.log(`fun ${f}`)
    }
}

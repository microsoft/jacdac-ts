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
    DebugInfo,
    FunctionDebugInfo,
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
        return this.buf.slice(this.start, this.end).buffer
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

class Resolver implements InstrArgResolver {
    constructor(private floats: Float64Array, private dbg: DebugInfo) {}
    resolverParams: number[]
    describeCell(t: CellKind, idx: number): string {
        switch (t) {
            case CellKind.GLOBAL:
                return this.dbg.globals[idx]?.name
            case CellKind.FLOAT_CONST:
                return this.floats[idx] + ""
            default:
                return undefined
        }
    }
    funName(idx: number): string {
        return this.dbg.functions[idx]?.name
    }
    roleName(idx: number): string {
        return this.dbg.roles[idx]?.name
    }
}

export function verifyBinary(bin: Uint8Array, dbg?: DebugInfo) {
    const hd = bin.slice(0, BinFmt.FixHeaderSize)
    assert(0, read32(hd, 0) == BinFmt.Magic0, "magic 0")
    assert(4, read32(hd, 4) == BinFmt.Magic1, "magic 1")

    if (!dbg)
        dbg = {
            functions: [],
            globals: [],
            roles: [],
            source: "",
        }
    const sourceLines = dbg.source.split(/\n/)

    const sects = range(6).map(
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
    const [funDesc, funData, floatData, roleData, strDesc, strData] = sects

    assert(
        floatData.offset,
        (floatData.length & 7) == 0,
        "float data 8-aligned"
    )
    const floats = new Float64Array(floatData.asBuffer())

    const resolver = new Resolver(floats, dbg)

    let prevProc = funData.start
    let idx = 0
    for (
        let ptr = funDesc.start;
        ptr < funDesc.end;
        ptr += BinFmt.FunctionHeaderSize
    ) {
        const funSect = new BinSection(bin, ptr)
        assert(ptr, funSect.start == prevProc, "func in order")
        funData.mustContain(ptr, funSect)
        prevProc = funSect.end
        verifyFunction(ptr, funSect, dbg.functions[idx])
        idx++
    }

    idx = 0
    for (
        let ptr = strDesc.start;
        ptr < strDesc.end;
        ptr += BinFmt.SectionHeaderSize
    ) {
        const strSect = new BinSection(bin, ptr)
        strData.mustContain(ptr, strSect)
        const str = fromUTF8(
            uint8ArrayToString(new Uint8Array(strSect.asBuffer()))
        )
        console.log(`str #${idx} = ${JSON.stringify(str)}`)
        idx++
    }

    idx = 0
    for (
        let ptr = roleData.start;
        ptr < roleData.end;
        ptr += BinFmt.RoleHeaderSize
    ) {
        const cl = read32(bin, ptr)
        console.log(`role #${idx} = ${hex(cl)} ${dbg.roles[idx]?.name || ""}`)
        idx++
    }

    for (let i = 0; i < floats.length; ++i)
        console.log(`float #${i} = ${floats[i]}`)

    function verifyFunction(hd: number, f: BinSection, dbg: FunctionDebugInfo) {
        assert(hd, f.length > 0, "func size > 0")
        const funcode = new Uint16Array(f.asBuffer())
        console.log(`fun ${f} ${dbg?.name}`)
        const srcmap = dbg?.srcmap || []
        let srcmapPtr = 0
        let prevLine = -1
        for (let pc = 0; pc < funcode.length; ++pc) {
            while (pc >= srcmap[srcmapPtr + 1] + srcmap[srcmapPtr + 2])
                srcmapPtr += 3
            if (prevLine != srcmap[srcmapPtr]) {
                prevLine = srcmap[srcmapPtr]
                if (prevLine)
                    console.log(
                        `; (${prevLine}): ${sourceLines[prevLine - 1] || ""}`
                    )
            }
            const instr = funcode[pc]
            const pref = isPrefixInstr(instr) ? "    " : "             "
            console.log(pref + stringifyInstr(instr, resolver))
        }
    }
}

import { fail } from "assert"
import { describe, it } from "mocha"
import { jdpack, jdunpack } from "../../src/jdom/pack"
import { bufferEq, fromHex, stringToBuffer, toHex } from "../../src/jdom/utils"

describe("jdpack", () => {
    function testPayload(fmt: string, data: any[], buf: Uint8Array) {
        it("payload " + fmt, () => {
            const a = jdpack(fmt, data)
            const b = buf
            console.log({ a, b })
            if (!bufferEq(a, b)) {
                fail(`not the same ${toHex(a)} != ${toHex(b)}`)
            }
        })
    }
    function fromHex2(s: string) {
        return fromHex(s.replace(/\s+/g, ""))
    }

    testPayload(
        "u0.8 u0.8 u0.8 u0.8",
        [0.999999, 1, 1.01, 10000],
        fromHex2(`ff ff ff ff`),
    )
    testPayload("u0.8 u0.8 u0.8", [0, -1, -100000], fromHex2(`00 00 00`))
    testPayload(
        "i1.7 i1.7 i1.7 i1.7",
        [0.999999, 1, 1.01, 10000],
        fromHex2(`7f 7f 7f 7f`),
    )

    testPayload(
        "u0.16 u0.16 u0.16 u0.16",
        [0.999999, 1, 1.01, 10000],
        fromHex2(`ffff ffff ffff ffff`),
    )
    testPayload(
        "i1.15 i1.15 i1.15 i1.15",
        [0.999999, 1, 1.01, 10000],
        fromHex2(`ff7f ff7f ff7f ff7f`),
    )

    testPayload("u16", [-10], fromHex2(`00 00`))
    testPayload("u8", [-10], fromHex2(`00`))
    testPayload(
        "u32 i32",
        [1 << 31, 1 << 31],
        fromHex2(`00 00 00 80 00 00 00 80`),
    )

    testPayload("u32", [1 << 31], fromHex2(`00 00 00 80`)) // no clamping
    testPayload("i32", [1 << 31], fromHex2(`00 00 00 80`))
    testPayload("u22.10", [-10], fromHex2(`00 00 00 00`)) // yes clamping

    testPayload("u64", [0xf00dbeef * 0x100], fromHex2(`00efbe0df0000000`))

    function testOne(
        fmt: string,
        data0: any[],
        options: {
            expectedPayload?: string
            maxError?: number
        } = {},
    ) {
        const { maxError, expectedPayload } = options
        function checksame(a: any, b: any) {
            function fail(msg: string): never {
                const err = `jdpack test error: ${msg} (at ${fmt}; a=${JSON.stringify(
                    a,
                )}; b=${JSON.stringify(b)})`
                //debugger
                throw new Error(err)
            }

            if (a === b) return
            if (
                a instanceof Uint8Array &&
                b instanceof Uint8Array &&
                bufferEq(a, b)
            )
                return
            if (Array.isArray(a)) {
                if (!Array.isArray(b)) fail("not array")
                if (a.length != b.length) fail("different length")
                for (let i = 0; i < a.length; ++i) checksame(a[i], b[i])
                return
            }
            if (
                maxError !== undefined &&
                typeof a === "number" &&
                typeof b === "number" &&
                Math.abs((a as number) - (b as number)) < maxError
            )
                return
            fail("not the same")
        }
        it(fmt, () => {
            const buf = jdpack(fmt, data0)
            const data1 = jdunpack(buf, fmt)

            const bufHex = toHex(buf)

            //console.log(fmt, data0, data1, toHex(buf))
            console.log(
                `${JSON.stringify(data0)}->${fmt}->${bufHex}->${JSON.stringify(
                    data1,
                )}`,
            )
            if (expectedPayload !== undefined && expectedPayload !== bufHex)
                fail(`payload ${bufHex}, exected ${expectedPayload}`)

            checksame(data0, data1)
        })
    }

    testOne("u16", [42])
    testOne("u8", [42])
    testOne("u32", [42])
    testOne("u16 u16 i16", [42, 77, -10])
    testOne("u16 z s", [42, "foo", "bar"])
    testOne("u32 z s", [42, "foo", "bar"])
    testOne("i8 z s", [42, "foo", "bar"])
    testOne("u8 z s", [42, "foo12", "bar"])
    testOne("u8 r: u8 z", [
        42,
        [
            [17, "xy"],
            [18, "xx"],
        ],
    ])
    testOne("z b", ["foo12", stringToBuffer("bar")])
    testOne("u16 r: u16", [42, [[17], [18]]])
    testOne("i8 s[9] u16 s[10] u8", [-100, "foo", 1000, "barbaz", 250])
    testOne("i8 x[4] s[9] u16 x[2] s[10] x[3] u8", [
        -100,
        "foo",
        1000,
        "barbaz",
        250,
    ])
    testOne("u16 u16[]", [42, [17, 18]])
    testOne("u16 u16[]", [42, [18]])
    testOne("u16 u16[]", [42, []])
    testOne("u16 z[]", [42, ["foo", "bar", "bz"]])

    const err = 1e-4
    testOne("u0.16", [0], { maxError: err })
    testOne("u0.16", [0.42], { maxError: err })
    testOne("u0.16", [1], { maxError: err })
    testOne("i1.15", [0], { maxError: err })
    testOne("i1.15", [1], { maxError: err })
    testOne("i1.15", [-1], { maxError: err })
    testOne(
        "b[8] u32 u8 s",
        [fromHex2(`a1b2c3d4e5f6a7b8`), 0x12345678, 0x42, "barbaz"],
        { expectedPayload: "a1b2c3d4e5f6a7b8785634124262617262617a" },
    )

    testOne("i16.16", [0.1], { maxError: err })
    testOne("i16.16", [1], { maxError: err })
    testOne("i16.16", [Math.PI], { maxError: err })
    testOne("r: u16", [[[0], [1]]])
    testOne("u16 r: u16", [1, [[2], [3]]])
})

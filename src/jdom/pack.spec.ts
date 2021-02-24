import { bufferEq, stringToBuffer, toHex } from "./utils"
import { describe, it } from "mocha"
import { jdpack, jdunpack } from "./pack";

describe('jdpack', () => {
    function testOne(fmt: string, data0: any[], maxError?: number) {
        function checksame(a: any, b: any) {
            function fail(msg: string): never {
                const err = `jdpack test error: ${msg} (at ${fmt}; a=${JSON.stringify(a)}; b=${JSON.stringify(b)})`;
                //debugger
                throw new Error(err)
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
            if (maxError !== undefined
                && typeof a === 'number'
                && typeof b === 'number'
                && Math.abs((a as number) - (b as number)) < maxError)
                return;

            fail("not the same")
        }
        it(fmt, () => {
            const buf = jdpack(fmt, data0)
            const data1 = jdunpack(buf, fmt)
            console.log(fmt, data0, data1, toHex(buf))
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
    testOne("u8 r: u8 z", [42, [[17, "xy"], [18, "xx"]]])
    testOne("z b", ["foo12", stringToBuffer("bar")])
    testOne("u16 r: u16", [42, [[17], [18]]])
    testOne("i8 s[9] u16 s[10] u8", [-100, "foo", 1000, "barbaz", 250])
    testOne("i8 x[4] s[9] u16 x[2] s[10] x[3] u8", [-100, "foo", 1000, "barbaz", 250])
    testOne("u16 u16[]", [42, [17, 18]])
    testOne("u16 u16[]", [42, [18]])
    testOne("u16 u16[]", [42, []])
    testOne("u16 z[]", [42, ["foo", "bar", "bz"]])

    const err = 1e-4
    testOne("u0.16", [0], err)
    testOne("u0.16", [0.42], err)
    testOne("u0.16", [1], err)
    testOne("i1.15", [0], err)
    testOne("i1.15", [1], err)
    testOne("i1.15", [-1], err)
})
import { suite, test } from "mocha"
import { ProtoTestCmd, SRV_PROTO_TEST } from "../../src/jdom/constants"
import { serviceSpecificationFromClassIdentifier } from "../../src/jdom/spec"
import { packArguments } from "../../src/jdom/command"
import { loadSpecifications } from "../testutils"
import { PackedValues } from "../../src/jdom/pack"

loadSpecifications()

suite("packArguments", () => {
    function testOne(cmdid: number, args: PackedValues) {
        const service = serviceSpecificationFromClassIdentifier(SRV_PROTO_TEST)
        const cmd = service.packets.find(
            pkt => pkt.kind === "command" && pkt.identifier === cmdid
        )
        const pkt = packArguments(cmd, args)
        console.log({ args, pkt })
    }
    test("cbool", () => testOne(ProtoTestCmd.CBool, [true]))
    test("c32", () => testOne(ProtoTestCmd.CU32, [42]))
    test("cString", () => testOne(ProtoTestCmd.CString, ["hi"]))
    test("cI8U8U16I32", () => testOne(ProtoTestCmd.CI8U8U16I32, [-1, 2, 3, 4]))
    test("cU8String", () => testOne(ProtoTestCmd.CU8String, [42, "hi"]))
})

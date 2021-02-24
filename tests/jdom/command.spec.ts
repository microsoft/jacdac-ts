import { describe, it } from "mocha"
import {
    packArguments, serviceSpecificationFromClassIdentifier,
    ProtoTestCmd, SRV_PROTO_TEST, ArgType
} from "../../dist/jacdac-jdom.cjs";

describe('packArguments', () => {
    function testOne(cmdid: number, args: ArgType[]) {
        const service = serviceSpecificationFromClassIdentifier(SRV_PROTO_TEST);
        const cmd = service.packets.find(pkt => pkt.kind === 'command' && pkt.identifier === cmdid);
        const pkt = packArguments(cmd, args);
        // TODO: do something with this
    }
    it("cbool", () => testOne(ProtoTestCmd.CBool, [true]));
    it("c32", () => testOne(ProtoTestCmd.CU32, [42]));
    it("cString", () => testOne(ProtoTestCmd.CString, ["hi"]));
    it("cI8U8U16I32", () => testOne(ProtoTestCmd.CI8U8U16I32, [-1,2,3,4]));
})
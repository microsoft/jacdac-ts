namespace jacdac {
    export class ProtoTestHost extends Host {
        constructor() {
            super("prototest", SRV_PROTO_TEST);
        }

        bool = false;
        i32 = 0;
        u32 = 0;
        s = "";
        bytes: Buffer = Buffer.create(0);
        i8u8u16i32: number[] = [0,0,0,0];

        handlePacket(pkt: JDPacket) {
            this.log(`pkt: ${pkt}`)

            const oldBool = this.bool;
            const oldi32 = this.i32;
            const oldu32 = this.u32;
            const olds = this.s;
            const oldbytes = this.bytes;
            const oldi8u8u16i32 = this.i8u8u16i32;

            this.bool = this.handleRegBool(pkt, jacdac.ProtoTestReg.RwBool, this.bool);
            this.handleRegBool(pkt, jacdac.ProtoTestReg.RoBool, this.bool);

            this.i32 = this.handleRegInt32(pkt, jacdac.ProtoTestReg.RwI32, this.i32);
            this.handleRegInt32(pkt, jacdac.ProtoTestReg.RoI32, this.i32);

            this.u32 = this.handleRegUInt32(pkt, jacdac.ProtoTestReg.RwU32, this.u32);
            this.handleRegUInt32(pkt, jacdac.ProtoTestReg.RoU32, this.u32);

            this.s = this.handleRegValue(pkt, jacdac.ProtoTestReg.RwString, "s", this.s);
            this.handleRegValue(pkt, jacdac.ProtoTestReg.RoString, "s", this.s);

            this.bytes = this.handleRegValue(pkt, jacdac.ProtoTestReg.RwBytes, "b", this.bytes);
            this.handleRegValue(pkt, jacdac.ProtoTestReg.RoBytes, "b", this.bytes);

            this.i8u8u16i32 = this.handleRegFormat<number[]>(pkt, jacdac.ProtoTestReg.RwI8U8U16I32, "i8 u8 u16 i32", this.i8u8u16i32);
            this.handleRegFormat<number[]>(pkt, jacdac.ProtoTestReg.RoI8U8U16I32, "i8 u8 u16 i32", this.i8u8u16i32);

            // commands
            switch (pkt.serviceCommand) {
                case jacdac.ProtoTestCmd.CBool:
                    this.bool = jdunpack(pkt.data, "u8")[0] != 0;
                    break;
                case jacdac.ProtoTestCmd.CI32:
                    this.i32 = jdunpack(pkt.data, "i32")[0];
                    break;
                case jacdac.ProtoTestCmd.CU32:
                    this.u32 = jdunpack(pkt.data, "u32")[0];
                    break;
                case jacdac.ProtoTestCmd.CString:
                    this.s = jdunpack(pkt.data, "s")[0];
                    break;
                case jacdac.ProtoTestCmd.CBytes:
                    this.bytes = jdunpack(pkt.data, "b")[0];
                    break;
                case jacdac.ProtoTestCmd.CI8U8U16I32:
                    this.i8u8u16i32 = jdunpack(pkt.data, "i8 u8 u16 i32");
                    break;
                case jacdac.ProtoTestCmd.CReportPipe: {
                    // pipe back bytes as indidivual pipe packets
                    const bs: number[] = [];
                    for (let i = 0; i < this.bytes.length; ++i)
                        bs.push(this.bytes[i]);
                    OutPipe.respondForEach(pkt, bs, b => jdpack("u8", [b]));
                    break;
                }
            }

            // events
            if (pkt.isRegSet) {
                if (pkt.regCode === jacdac.ProtoTestReg.RwBool)
                    this.sendEvent(jacdac.ProtoTestEvent.EBool, jdpack("u8", [this.bool ? 1 : 0]))
                else if (pkt.regCode === jacdac.ProtoTestReg.RwI32)
                    this.sendEvent(jacdac.ProtoTestEvent.EI32, jdpack("i32", [this.i32]))
                else if (pkt.regCode === jacdac.ProtoTestReg.RwU32)
                    this.sendEvent(jacdac.ProtoTestEvent.EU32, jdpack("u32", [this.i32]))
                else if (pkt.regCode === jacdac.ProtoTestReg.RwString)
                    this.sendEvent(jacdac.ProtoTestEvent.EString, jdpack("s", [this.s]))
                else if (pkt.regCode === jacdac.ProtoTestReg.RwBytes)
                    this.sendEvent(jacdac.ProtoTestEvent.EBytes, jdpack("b", [this.bytes]))
                else if (pkt.regCode === jacdac.ProtoTestReg.RwI8U8U16I32)
                    this.sendEvent(jacdac.ProtoTestEvent.EI8U8U16I32, jdpack("i8 u8 u16 i32", this.i8u8u16i32))
            }
        }
    }

    //% whenUsed
    export const protoTestHost = new ProtoTestHost();
}

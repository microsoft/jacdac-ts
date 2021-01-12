import { SRV_PROTO_TEST, CHANGE, ProtoTestReg, ProtoTestCmd, ProtoTestEvent } from "../jacdac";
import { jdunpack } from "./pack";
import JDServiceHost from "./servicehost";

export default class ProtocolTestServiceHost extends JDServiceHost {
    constructor() {
        super(SRV_PROTO_TEST);


        const init = (rwi: number, roi: number, ci: number, ei: number, fmt: string, values: any[]) => {
            const rw = this.addRegister(rwi, fmt, values);
            const ro = this.addRegister(roi, rw.packFormat, rw.values());
            rw.on(CHANGE, () => {
                ro.setValues(rw.values())
                this.sendEvent(ei, rw.data);
            });

            this.addCommand(ci, pkt => rw.setValues(jdunpack(pkt.data, fmt)))
        }

        init(ProtoTestReg.RwBool, ProtoTestReg.RoBool, ProtoTestCmd.CBool, ProtoTestEvent.EBool, "u8", [false]);
        init(ProtoTestReg.RwI32, ProtoTestReg.RoI32, ProtoTestCmd.CI32, ProtoTestEvent.EI32, "i32", [0]);
        init(ProtoTestReg.RwU32, ProtoTestReg.RoU32, ProtoTestCmd.CU32, ProtoTestEvent.EU32, "u32", [0]);
        init(ProtoTestReg.RwString, ProtoTestReg.RoString, ProtoTestCmd.CString, ProtoTestEvent.EString, "s", [""]);
        init(ProtoTestReg.RwBytes, ProtoTestReg.RoBytes, ProtoTestCmd.CBytes, ProtoTestEvent.EBytes, "b", [new Uint8Array(0)]);
        init(ProtoTestReg.RwI8U8U16I32, ProtoTestReg.RoI8U8U16I32, ProtoTestCmd.CI8U8U16I32, ProtoTestEvent.EI8U8U16I32, "i8 u8 u16 i32", [0, 0, 0, 0]);
    }
}

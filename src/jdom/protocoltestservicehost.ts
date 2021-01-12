import { SRV_PROTO_TEST, CHANGE, ProtoTestReg, ProtoTestCmd, ProtoTestEvent } from "../jacdac";
import { jdunpack } from "./pack";
import JDServiceHost from "./servicehost";

export default class ProtocolTestServiceHost extends JDServiceHost {
    constructor() {
        super(SRV_PROTO_TEST);

        const init = (rwi: number, roi: number, ci: number, ei: number, ...values: any[]) => {
            const rw = this.addRegister(rwi, values);
            const ro = this.addRegister(roi, rw.values());
            rw.on(CHANGE, () => {
                ro.setValues(rw.values())
                this.sendEvent(ei, rw.data);
            });

            this.addCommand(ci, pkt => rw.setValues(jdunpack(pkt.data, rw.specification.packFormat)))
        }

        init(ProtoTestReg.RwBool, ProtoTestReg.RoBool, ProtoTestCmd.CBool, ProtoTestEvent.EBool, false);
        init(ProtoTestReg.RwI32, ProtoTestReg.RoI32, ProtoTestCmd.CI32, ProtoTestEvent.EI32, 0);
        init(ProtoTestReg.RwU32, ProtoTestReg.RoU32, ProtoTestCmd.CU32, ProtoTestEvent.EU32, 0);
        init(ProtoTestReg.RwString, ProtoTestReg.RoString, ProtoTestCmd.CString, ProtoTestEvent.EString, "");
        init(ProtoTestReg.RwBytes, ProtoTestReg.RoBytes, ProtoTestCmd.CBytes, ProtoTestEvent.EBytes, new Uint8Array(0));
        init(ProtoTestReg.RwI8U8U16I32, ProtoTestReg.RoI8U8U16I32, ProtoTestCmd.CI8U8U16I32, ProtoTestEvent.EI8U8U16I32, 0, 0, 0, 0);
    }
}

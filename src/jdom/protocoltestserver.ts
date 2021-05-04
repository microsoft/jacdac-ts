import {
    SRV_PROTO_TEST,
    CHANGE,
    ProtoTestReg,
    ProtoTestCmd,
    ProtoTestEvent,
} from "./constants"
import { jdpack, jdunpack } from "./pack"
import Packet from "./packet"
import { OutPipe } from "./pipes"
import JDRegisterServer from "./registerserver"
import JDServiceServer from "./serviceserver"

export default class ProtocolTestServer extends JDServiceServer {
    private rwBytes: JDRegisterServer<[Uint8Array]>

    constructor() {
        super(SRV_PROTO_TEST)

        this.init<[boolean]>(
            ProtoTestReg.RwBool,
            ProtoTestReg.RoBool,
            ProtoTestCmd.CBool,
            ProtoTestEvent.EBool,
            false
        )
        this.init<[number]>(
            ProtoTestReg.RwI32,
            ProtoTestReg.RoI32,
            ProtoTestCmd.CI32,
            ProtoTestEvent.EI32,
            0
        )
        this.init<[number]>(
            ProtoTestReg.RwU32,
            ProtoTestReg.RoU32,
            ProtoTestCmd.CU32,
            ProtoTestEvent.EU32,
            0
        )
        this.init<[string]>(
            ProtoTestReg.RwString,
            ProtoTestReg.RoString,
            ProtoTestCmd.CString,
            ProtoTestEvent.EString,
            ""
        )
        this.rwBytes = this.init<[Uint8Array]>(
            ProtoTestReg.RwBytes,
            ProtoTestReg.RoBytes,
            ProtoTestCmd.CBytes,
            ProtoTestEvent.EBytes,
            new Uint8Array(0)
        )
        this.init<[number, number, number, number]>(
            ProtoTestReg.RwI8U8U16I32,
            ProtoTestReg.RoI8U8U16I32,
            ProtoTestCmd.CI8U8U16I32,
            ProtoTestEvent.EI8U8U16I32,
            0,
            0,
            0,
            0
        )
        this.init<[number, string]>(
            ProtoTestReg.RwU8String,
            ProtoTestReg.RoU8String,
            ProtoTestCmd.CU8String,
            ProtoTestEvent.EU8String,
            0,
            ""
        )

        this.addCommand(
            ProtoTestCmd.CReportPipe,
            this.handleReportPipe.bind(this)
        )
    }

    private init<TValues extends any[]>(
        rwi: number,
        roi: number,
        ci: number,
        ei: number,
        ...values: TValues
    ) {
        const rw = this.addRegister(rwi, values)
        const ro = this.addRegister(roi, rw.values())
        rw.on(CHANGE, () => {
            ro.setValues(rw.values())
            this.sendEvent(ei, rw.data)
        })
        this.addCommand(ci, pkt =>
            rw.setValues(jdunpack(pkt.data, rw.specification.packFormat))
        )
        return rw
    }

    private async handleReportPipe(pkt: Packet) {
        const pipe = OutPipe.from(this.device.bus, pkt, true)
        await pipe.respondForEach(this.rwBytes.data, (b: number) => {
            const buf = new Uint8Array(1)
            buf[0] = b
            return jdpack<[Uint8Array]>("b", [buf])
        })
    }
}

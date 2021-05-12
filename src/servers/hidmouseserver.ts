import {
    HidMouseButton,
    HidMouseButtonEvent,
    HidMouseCmd,
    SRV_HID_MOUSE,
} from "../jdom/constants"
import Packet from "../jdom/packet"
import JDServiceServer, { ServerOptions } from "../jdom/serviceserver"

export default class HIDMouseServer extends JDServiceServer {
    constructor(options?: ServerOptions) {
        super(SRV_HID_MOUSE, options)

        this.addCommand(HidMouseCmd.Move, this.handleMove.bind(this))
        this.addCommand(HidMouseCmd.SetButton, this.handleSetButton.bind(this))
        this.addCommand(HidMouseCmd.Wheel, this.handleWheel.bind(this))
    }

    private handleMove(pkt: Packet) {
        const [dx, dy, time] = pkt.jdunpack<[number, number, number]>(
            "i16 i16 u16"
        )
        console.log({ dx, dy, time })
    }

    private handleSetButton(pkt: Packet) {
        const [buttons, event] = pkt.jdunpack<
            [HidMouseButton, HidMouseButtonEvent]
        >("u16 u8")
        console.log({ buttons, event })
    }

    private handleWheel(pkt: Packet) {
        const [dy, time] = pkt.jdunpack<[number, number]>("i16 u16")
        console.log({ dy, time })
    }
}

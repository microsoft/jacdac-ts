import { HidKeyboardAction, HidKeyboardCmd, HidKeyboardModifiers, SRV_HID_KEYBOARD } from "../jdom/constants";
import Packet from "../jdom/packet";
import JDServiceServer, { ServerOptions } from "../jdom/serviceserver";

export default class HIDKeyboardServer extends JDServiceServer {
    constructor(options?: ServerOptions) {
        super(SRV_HID_KEYBOARD, options)

        this.addCommand(HidKeyboardCmd.Clear, this.handleClear.bind(this))
        this.addCommand(HidKeyboardCmd.Key, this.handleKey.bind(this))
    }

    private handleKey(pkt: Packet) {
        const [rest] = pkt.jdunpack<[([number, HidKeyboardModifiers, HidKeyboardAction])[]]>("r: u16 u8 u8")
        console.log(rest)
    }

    private handleClear() {
        console.log(`keyboard: clear`)
    }
}
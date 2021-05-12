import { CHANGE, HidKeyboardAction, HidKeyboardCmd, HidKeyboardModifiers, SRV_HID_KEYBOARD } from "../jdom/constants";
import Packet from "../jdom/packet";
import JDServiceServer, { ServerOptions } from "../jdom/serviceserver";

export default class HIDKeyboardServer extends JDServiceServer {
    private _lastKey: [number, HidKeyboardModifiers, HidKeyboardAction][]

    constructor(options?: ServerOptions) {
        super(SRV_HID_KEYBOARD, options)

        this.addCommand(HidKeyboardCmd.Clear, this.handleClear.bind(this))
        this.addCommand(HidKeyboardCmd.Key, this.handleKey.bind(this))
    }

    get lastKey() {
        return this._lastKey
    }

    private handleKey(pkt: Packet) {
        const [rest] = pkt.jdunpack<[([number, HidKeyboardModifiers, HidKeyboardAction])[]]>("r: u16 u8 u8")
        this._lastKey = rest
        this.emit(CHANGE)
    }

    private handleClear() {
        if (this._lastKey) {
            this._lastKey = undefined
            this.emit(CHANGE)
        }
    }
}
import {
    CHANGE,
    HidMouseButton,
    HidMouseButtonEvent,
    HidMouseCmd,
    SRV_HID_MOUSE,
} from "../jdom/constants"
import Packet from "../jdom/packet"
import JDServiceServer, { ServerOptions } from "../jdom/serviceserver"

export default class HIDMouseServer extends JDServiceServer {
    private _lastCommand: string

    constructor(options?: ServerOptions) {
        super(SRV_HID_MOUSE, options)

        this.addCommand(HidMouseCmd.Move, this.handleMove.bind(this))
        this.addCommand(HidMouseCmd.SetButton, this.handleSetButton.bind(this))
        this.addCommand(HidMouseCmd.Wheel, this.handleWheel.bind(this))
    }

    get lastCommand() {
        return this._lastCommand
    }

    setLastCommand(s: string) {
        if (this._lastCommand !== s) {
            this._lastCommand = s
            this.emit(CHANGE)
        }
    }

    private handleMove(pkt: Packet) {
        const [dx, dy] = pkt.jdunpack<[number, number, number]>("i16 i16 u16")
        this.setLastCommand(`move ${dx} ${dy}`)
    }

    private handleSetButton(pkt: Packet) {
        const [buttons, event] = pkt.jdunpack<
            [HidMouseButton, HidMouseButtonEvent]
        >("u16 u8")
        const btns = [
            buttons & HidMouseButton.Left ? "left" : "",
            buttons & HidMouseButton.Right ? "right" : "",
            buttons & HidMouseButton.Middle ? "middle" : "",
        ]
            .filter(b => !!b)
            .join(", ")
        this.setLastCommand(`set buttons ${btns} ${HidMouseButtonEvent[event]}`)
    }

    private handleWheel(pkt: Packet) {
        const [dy] = pkt.jdunpack<[number, number]>("i16 u16")
        this.setLastCommand(`wheel ${dy}`)
    }
}

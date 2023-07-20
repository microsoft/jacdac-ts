import {
    CHANGE,
    HidMouseButton,
    HidMouseButtonEvent,
    HidMouseCmd,
    SRV_HID_MOUSE,
} from "../jdom/constants"
import { Packet } from "../jdom/packet"
import { JDServiceServer, JDServerOptions } from "../jdom/servers/serviceserver"

/**
 * @internal
 */
export function renderHidMouseButtons(buttons: HidMouseButton) {
    const btns = [
        buttons & HidMouseButton.Left ? "left" : "",
        buttons & HidMouseButton.Right ? "right" : "",
        buttons & HidMouseButton.Middle ? "middle" : "",
    ]
        .filter(b => !!b)
        .join(", ")
    return btns
}

export class HIDMouseServer extends JDServiceServer {
    private _lastCommand: string

    constructor(options?: JDServerOptions) {
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
        const [dx, dy, time] =
            pkt.jdunpack<[number, number, number]>("i16 i16 u16")
        this.setLastCommand(`move ${dx} ${dy} ${time}`)
    }

    private handleSetButton(pkt: Packet) {
        const [buttons, event] =
            pkt.jdunpack<[HidMouseButton, HidMouseButtonEvent]>("u16 u8")
        const btns = renderHidMouseButtons(buttons)
        this.setLastCommand(
            `set buttons ${btns || "?"} ${(
                HidMouseButtonEvent[event] || "?"
            ).toLocaleLowerCase()}`,
        )
    }

    private handleWheel(pkt: Packet) {
        const [dy, time] = pkt.jdunpack<[number, number]>("i16 u16")
        this.setLastCommand(`wheel ${dy} ${time}`)
    }
}

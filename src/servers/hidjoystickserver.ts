import {
    HidJoystickCmd,
    HidJoystickReg,
    SRV_HID_JOYSTICK,
} from "../jdom/constants"
import { Packet } from "../jdom/packet"
import { JDServerOptions, JDServiceServer } from "../jdom/servers/serviceserver"

export class HIDJoystickServer extends JDServiceServer {
    buttons: Uint8Array = new Uint8Array()
    axis: Uint8Array = new Uint8Array()

    constructor(
        options?: {
            buttonCount: number
            axisCount: number
            buttonsAnalog: boolean
        } & JDServerOptions
    ) {
        super(SRV_HID_JOYSTICK, options)
        const {
            buttonCount = 16,
            axisCount = 6,
            buttonsAnalog = false,
        } = options || {}

        this.addRegister(HidJoystickReg.ButtonCount, [buttonCount])
        this.addRegister(HidJoystickReg.AxisCount, [axisCount])
        this.addRegister(HidJoystickReg.ButtonsAnalog, [buttonsAnalog])

        this.addCommand(
            HidJoystickCmd.SetButtons,
            this.handleSetButtons.bind(this)
        )
        this.addCommand(HidJoystickCmd.SetAxis, this.handleSetAxis.bind(this))
    }

    private handleSetButtons(pkt: Packet) {
        this.buttons = pkt.data
    }
    private handleSetAxis(pkt: Packet) {
        this.axis = pkt.data
    }
}

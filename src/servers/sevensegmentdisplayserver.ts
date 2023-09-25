import {
    SRV_SEVEN_SEGMENT_DISPLAY,
    SevenSegmentDisplayCmd,
    SevenSegmentDisplayCmdPack,
    SevenSegmentDisplayReg,
} from "../jdom/constants"
import { Packet } from "../jdom/packet"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer } from "../jdom/servers/serviceserver"
import { sevenSegmentDigitEncode } from "../jdom/sevensegment"

export class SevenSegmentDisplayServer extends JDServiceServer {
    readonly digits: JDRegisterServer<[Uint8Array]>
    readonly digitCount: JDRegisterServer<[number]>
    readonly decimalPoint: JDRegisterServer<[boolean]>
    constructor(options: { digits: Uint8Array; decimalPoint?: boolean }) {
        super(SRV_SEVEN_SEGMENT_DISPLAY, {
            intensityValues: [0xffff],
        })

        const { digits, decimalPoint } = options

        this.digitCount = this.addRegister<[number]>(
            SevenSegmentDisplayReg.DigitCount,
            [digits.length],
        )
        this.decimalPoint = this.addRegister<[boolean]>(
            SevenSegmentDisplayReg.DecimalPoint,
            [!!decimalPoint],
        )
        this.digits = this.addRegister<[Uint8Array]>(
            SevenSegmentDisplayReg.Digits,
            [digits],
        )

        this.addCommand(
            SevenSegmentDisplayCmd.SetNumber,
            this.handleSetNumber.bind(this),
        )
    }

    private async handleSetNumber(pkt: Packet) {
        const [digitCount] = this.digitCount.values()
        const [value] = pkt.jdunpack<[number]>(
            SevenSegmentDisplayCmdPack.SetNumber,
        )
        const digits = isNaN(value)
            ? new Uint8Array(0)
            : sevenSegmentDigitEncode(value, digitCount)
        if (this.digits.setValues([digits])) await this.digits.sendGetAsync()
    }
}

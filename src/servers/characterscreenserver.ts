import {
    CharacterScreenReg,
    CharacterScreenTextDirection,
    CharacterScreenVariant,
    CharacterScreenCmd,
    SRV_CHARACTER_SCREEN,
} from "../jdom/constants"
import Packet from "../jdom/packet"
import JDRegisterServer from "../jdom/registerserver"
import JDServiceServer from "../jdom/serviceserver"

export default class CharacterScreenServer extends JDServiceServer {
    readonly message: JDRegisterServer<[string]>
    readonly brightness: JDRegisterServer<[number]>
    readonly rows: JDRegisterServer<[number]>
    readonly columns: JDRegisterServer<[number]>
    readonly variant: JDRegisterServer<[CharacterScreenVariant]>
    readonly textDirection: JDRegisterServer<[CharacterScreenTextDirection]>

    constructor(options?: {
        message?: string
        brightness?: number
        rows?: number
        columns?: number
        variant?: CharacterScreenVariant
        textDirection?: CharacterScreenTextDirection
    }) {
        super(SRV_CHARACTER_SCREEN)
        const {
            message = "",
            rows = 2,
            columns = 16,
            variant,
            textDirection,
            brightness = 100,
        } = options || {}

        this.message = this.addRegister<[string]>(CharacterScreenReg.Message, [
            message,
        ])
        this.brightness = this.addRegister<[number]>(
            CharacterScreenReg.Brightness,
            [brightness]
        )
        this.rows = this.addRegister<[number]>(CharacterScreenReg.Rows, [rows])
        this.columns = this.addRegister<[number]>(CharacterScreenReg.Columns, [
            columns,
        ])
        this.variant = this.addRegister<[CharacterScreenVariant]>(
            CharacterScreenReg.Variant,
            [variant || CharacterScreenVariant.LCD]
        )
        this.message = this.addRegister<[string]>(CharacterScreenReg.Message, [
            "",
        ])
        this.textDirection = this.addRegister<[CharacterScreenTextDirection]>(
            CharacterScreenReg.TextDirection,
            [textDirection || CharacterScreenTextDirection.LeftToRight]
        )

        this.addCommand(
            CharacterScreenCmd.SetLine,
            this.handleSetLine.bind(this)
        )
        this.addCommand(CharacterScreenCmd.Clear, this.handleClear.bind(this))
    }

    handleClear() {
        this.message.setValues([""])
    }

    handleSetLine(pkt: Packet) {
        const [line, lineMessage] = pkt.jdunpack<[number, string]>("u16 s")
        const [rows] = this.rows.values()
        if (line >= rows) return
        const [columns] = this.columns.values()

        const [message = ""] = this.message.values()
        const lines = message.split("\n")
        lines[line] = lineMessage.slice(0, columns) // clip as needed
        const newMessage = lines.map(l => l || "").join("\n")
        this.message.setValues([newMessage])
    }
}

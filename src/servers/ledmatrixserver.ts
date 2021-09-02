import {
    CHANGE,
    LedMatrixReg,
    SensorReg,
    SRV_LED_MATRIX,
} from "../jdom/constants"
import JDRegisterServer from "../jdom/servers/registerserver"
import JDServiceServer from "../jdom/servers/serviceserver"

export default class LEDMatrixServer extends JDServiceServer {
    readonly leds: JDRegisterServer<[Uint8Array]>
    readonly rows: JDRegisterServer<[number]>
    readonly columns: JDRegisterServer<[number]>
    readonly brightness: JDRegisterServer<[number]>

    constructor(columns: number, rows: number) {
        super(SRV_LED_MATRIX, {
            intensityValues: [0xff >> 1],
        })

        this.leds = this.addRegister(LedMatrixReg.Leds, [new Uint8Array(0)])
        this.rows = this.addRegister(LedMatrixReg.Rows, [rows])
        this.columns = this.addRegister(LedMatrixReg.Columns, [columns])
        this.brightness = this.addRegister(LedMatrixReg.Brightness, [128])

        this.rows.skipBoundaryCheck = true
        this.rows.skipErrorInjection = true

        // 20fps
        this.addRegister<[number]>(SensorReg.StreamingPreferredInterval, [50])

        this.rows.on(CHANGE, this.updateLedBuffer.bind(this))
        this.columns.on(CHANGE, this.updateLedBuffer.bind(this))

        this.updateLedBuffer()
    }

    private updateLedBuffer() {
        // columns must be byte aligned
        const [rows] = this.rows.values()
        const [columns] = this.columns.values()

        // there's probably a much smarter way to do this
        const columnspadded = columns + (8 - (columns % 8))
        // total bits needed
        const n = rows * columnspadded

        if (this.leds.data?.length !== n) {
            // skip serialization
            this.leds.data = new Uint8Array(n)

            // testing
            this.leds.data.fill(0x01 | 0x04 | 0x10 | 0x40)
            this.leds.emit(CHANGE)
        }
    }
}

import {
    CHANGE,
    DotMatrixReg,
    DotMatrixVariant,
    SensorReg,
    SRV_DOT_MATRIX,
} from "../jdom/constants"
import JDRegisterServer from "../jdom/servers/registerserver"
import JDServiceServer from "../jdom/servers/serviceserver"

export default class DotMatrixServer extends JDServiceServer {
    readonly dots: JDRegisterServer<[Uint8Array]>
    readonly rows: JDRegisterServer<[number]>
    readonly columns: JDRegisterServer<[number]>
    readonly brightness: JDRegisterServer<[number]>
    readonly variant: JDRegisterServer<[DotMatrixVariant]>

    constructor(
        columns: number,
        rows: number,
        options?: {
            brightness?: number
            variant?: DotMatrixVariant
        }
    ) {
        super(SRV_DOT_MATRIX)
        const { brightness, variant } = options
        this.dots = this.addRegister(DotMatrixReg.Dots, [new Uint8Array(0)])
        this.rows = this.addRegister(DotMatrixReg.Rows, [rows])
        this.columns = this.addRegister(DotMatrixReg.Columns, [columns])
        if (brightness !== undefined)
            this.brightness = this.addRegister(DotMatrixReg.Brightness, [128])
        if (variant !== undefined)
            this.variant = this.addRegister(DotMatrixReg.Variant, [variant])
        this.rows.skipBoundaryCheck = true
        this.rows.skipErrorInjection = true

        // 20fps
        this.addRegister<[number]>(SensorReg.StreamingPreferredInterval, [50])

        this.rows.on(CHANGE, this.updateDotsBuffer.bind(this))
        this.columns.on(CHANGE, this.updateDotsBuffer.bind(this))

        this.updateDotsBuffer()
    }

    private updateDotsBuffer() {
        // columns must be byte aligned
        const [rows] = this.rows.values()
        const [columns] = this.columns.values()

        // there's probably a much smarter way to do this
        const columnspadded = columns + (8 - (columns % 8))
        // total bits needed
        const n = rows * columnspadded

        if (this.dots.data?.length !== n) {
            // skip serialization
            this.dots.data = new Uint8Array(n)

            // testing
            this.dots.data.fill(0x01 | 0x04 | 0x10 | 0x40)
            this.dots.emit(CHANGE)
        }
    }
}

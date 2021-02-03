import { CHANGE, LEDMatrixReg, SensorReg, SRV_LEDMATRIX } from "../jdom/constants";
import RegisterHost from "../jdom/registerhost";
import ServiceHost from "../jdom/servicehost";

export default class LEDMatrixServiceHost extends ServiceHost {
    readonly leds: RegisterHost<[Uint8Array]>;
    readonly rows: RegisterHost<[number]>;
    readonly columns: RegisterHost<[number]>;
    readonly brightness: RegisterHost<[number]>;

    constructor(columns: number, rows: number) {
        super(SRV_LEDMATRIX, {
            intensityValues: [0xff >> 1]
        })

        this.dashboardWeight = 3;

        this.leds = this.addRegister(LEDMatrixReg.Leds, [new Uint8Array(0)])
        this.rows = this.addRegister(LEDMatrixReg.Rows, [rows]);
        this.columns = this.addRegister(LEDMatrixReg.Columns, [columns]);
        this.brightness = this.addRegister(LEDMatrixReg.Brightness, [128]);

        this.rows.skipBoundaryCheck = true;
        this.rows.skipErrorInjection = true;

        // 20fps
        this.addRegister<[number]>(SensorReg.StreamingPreferredInterval, [50]);

        this.rows.on(CHANGE, this.updateLedBuffer.bind(this));
        this.columns.on(CHANGE, this.updateLedBuffer.bind(this));

        this.updateLedBuffer();
    }

    toggle(bitindex: number) {
        // this is very inefficient?
        const [data] = this.leds.values();
        // find bit to flip
        let byte = data[bitindex >> 3];
        const bit = bitindex % 8;
        const on = 1 === ((byte >> bit) & 1)
        // flip bit
        if (on) {
            byte &= ~(1 << bit);
        } else {
            byte |= 1 << bit;
        }
        // save
        data[bitindex >> 3] = byte;
        this.leds.setValues([data])
    }

    clear() {
        const [data] = this.leds.values();
        data.fill(0);
        this.leds.setValues([data])
    }

    private updateLedBuffer() {
        // columns must be byte aligned
        const [rows] = this.rows.values();
        const [columns] = this.columns.values();

        // there's probably a much smarter way to do this
        const columnspadded = columns + (8 - columns % 8)
        // total bits needed
        const n = rows * columnspadded;

        if (this.leds.data?.length !== n) {
            // skip serialization
            this.leds.data = new Uint8Array(n);

            // testing
            this.leds.data.fill(0x01 | 0x04 | 0x10 | 0x40)
            this.leds.emit(CHANGE);
        }
    }
}
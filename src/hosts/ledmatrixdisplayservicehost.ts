import { CHANGE, LedMatrixDisplayReg, SensorReg, SRV_LED_MATRIX_DISPLAY } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDSensorServiceHost from "./sensorservicehost";

export default class LEDMatrixDisplayServiceHost extends JDSensorServiceHost<Uint8Array> {
    readonly rows: JDRegisterHost<[number]>;
    readonly columns: JDRegisterHost<[number]>;
    readonly brightness: JDRegisterHost<[number]>;

    constructor(columns: number, rows: number) {
        super(SRV_LED_MATRIX_DISPLAY, {
            readingValues: [new Uint8Array(0)],
            intensityValues: [0xff >> 1]
        })

        this.rows = this.addRegister(LedMatrixDisplayReg.Rows, [rows]);
        this.columns = this.addRegister(LedMatrixDisplayReg.Columns, [columns]);
        this.brightness = this.addRegister(LedMatrixDisplayReg.Brightness, [128]);

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
        const [data] = this.reading.values();
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
        this.reading.setValues([data])
    }

    clear() {
        const [data] = this.reading.values();
        data.fill(0);
        this.reading.setValues([data])
    }

    private updateLedBuffer() {
        // columns must be byte aligned
        const [rows] = this.rows.values();
        const [columns] = this.columns.values();

        // there's probably a much smarter way to do this
        const columnspadded = columns + (8 - columns % 8)
        // total bits needed
        const n = rows * columnspadded;

        if (this.reading.data?.length !== n) {
            // skip serialization
            this.reading.data = new Uint8Array(n);

            // testing
            this.reading.data.fill(0x01 | 0x04 | 0x10 | 0x40)
            this.reading.emit(CHANGE);
        }
    }
}
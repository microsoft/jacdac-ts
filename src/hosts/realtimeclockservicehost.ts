import JDSensorServiceHost from "./sensorservicehost";
import { RealTimeClockReg, RealTimeClockVariant, REFRESH, SRV_REAL_TIME_CLOCK } from "../jdom/constants"
import JDRegisterHost from "../jdom/registerhost";

export type RealTimeClockReadingType = [number, number, number, number, number, number, number, number];

export function dateToClock(n: Date): RealTimeClockReadingType {
    const epoch = (n.getTime() / 1000) >> 0;
    const year = n.getFullYear();
    const month = n.getMonth();
    const date = n.getDate();
    const day = n.getDay()
    const hour = n.getHours()
    const min = n.getMinutes()
    const sec = n.getSeconds()

    return [epoch, year, month, date, day, hour, min, sec];
}

export default class RealTimeClockServiceHost
    extends JDSensorServiceHost<RealTimeClockReadingType> {
    readonly error: JDRegisterHost<[number]>;
    readonly precision: JDRegisterHost<[number]>;
    private lastEpoch: number = 0;

    constructor() {
        super(SRV_REAL_TIME_CLOCK, {
            readingValues: dateToClock(new Date()),
            variant: RealTimeClockVariant.Computer
        })

        this.error = this.addRegister<[number]>(RealTimeClockReg.Error, [0]);
        this.precision = this.addRegister<[number]>(RealTimeClockReg.Precision, [0]);

        this.on(REFRESH, this.refreshTime.bind(this));
    }

    private refreshTime() {
        const r = dateToClock(new Date());
        if (r[0] !== this.lastEpoch) {
            this.reading.setValues(r);
            this.lastEpoch = r[0];
        }
    }
}
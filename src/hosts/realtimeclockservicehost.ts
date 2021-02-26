import SensorServiceHost from "./sensorservicehost";
import { RealTimeClockCmd, RealTimeClockReg, RealTimeClockVariant, REFRESH, SRV_REAL_TIME_CLOCK } from "../jdom/constants"
import RegisterHost from "../jdom/registerhost";
import { JDBus } from "../jdom/bus";
import Packet from "../jdom/packet";

export type RealTimeClockReadingType = [number, number, number, number, number, number, number];

export function dateToClock(n: Date): RealTimeClockReadingType {
    const year = n.getFullYear();
    const month = n.getMonth() + 1;
    const date = n.getDate();
    const day = n.getDay()
    const hour = n.getHours()
    const min = n.getMinutes()
    const sec = n.getSeconds()

    return [year, month, date, day, hour, min, sec];
}

export default class RealTimeClockServiceHost
    extends SensorServiceHost<RealTimeClockReadingType> {
    readonly error: RegisterHost<[number]>;
    readonly precision: RegisterHost<[number]>;
    private lastSecond = 0;

    constructor() {
        super(SRV_REAL_TIME_CLOCK, {
            readingValues: dateToClock(new Date()),
            variant: RealTimeClockVariant.Computer,
            streamingInterval: 1000
        })

        this.error = this.addRegister<[number]>(RealTimeClockReg.Error, [0]);
        this.precision = this.addRegister<[number]>(RealTimeClockReg.Precision, [0]);

        this.addCommand(RealTimeClockCmd.SetTime, this.handleSetTime.bind(this))
        this.on(REFRESH, this.refreshTime.bind(this));
    }

    static async syncTime(bus: JDBus) {
        const values = dateToClock(new Date());
        const pkt = Packet.jdpacked<RealTimeClockReadingType>(RealTimeClockCmd.SetTime,
            "u16 u8 u8 u8 u8 u8 u8",
            values);
        await pkt.sendAsMultiCommandAsync(bus, SRV_REAL_TIME_CLOCK);
    }

    private handleSetTime(pkt: Packet) {
        console.log(`set time`, { pkt })
    }

    private refreshTime() {
        const d = new Date();
        const s = d.getSeconds();
        if (s !== this.lastSecond) {
            const r = dateToClock(d);
            this.reading.setValues(r);
            this.lastSecond = s;
        }
    }
}
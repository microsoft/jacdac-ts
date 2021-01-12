import { SystemReg } from "../../jacdac-spec/dist/specconstants";
import { SensorReg } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";
import { isRegister } from "../jdom/spec";

export default class JDSensorServiceHost extends JDServiceHost {
    readonly reading: JDRegisterHost;
    readonly streamingSamples: JDRegisterHost;
    readonly streamingInterval: JDRegisterHost;
    private lastStream = 0;

    constructor(public readonly serviceClass: number,
        readingValue?: any[],
        streamingInterval?: number
        ) {
        super(serviceClass);

        const readingRegister = this.specification.packets.find(pkt => isRegister(pkt) && pkt.identifier === SystemReg.Reading);
        this.reading = this.addRegister(SystemReg.Reading, readingValue);
        this.streamingSamples = this.addRegister(SensorReg.StreamingSamples);
        this.streamingInterval = this.addRegister(SensorReg.StreamingInterval, [streamingInterval || 50]);
        if (streamingInterval !== undefined)
            this.addRegister(SensorReg.StreamingPreferredInterval, [streamingInterval]);
    }

    refreshRegisters() {
        const [samples] = this.streamingSamples.values<[number]>();
        if (samples <= 0)
            return;
        // is it time to stream?
        const [interval] = this.streamingInterval.values<[number]>();
        const now = this.device.bus.timestamp;
        if (now - this.lastStream > interval) {
            // let's stream a value!
            this.lastStream = now;
            this.streamingSamples.setValues([samples - 1]);
            this.reading.sendGetAsync();
        }
    }
}
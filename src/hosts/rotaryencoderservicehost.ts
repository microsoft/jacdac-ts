import { RotaryEncoderReg, SRV_ROTARY_ENCODER } from "../jdom/constants";
import SensorServiceHost from "./sensorservicehost";
import RegisterHost from "../jdom/registerhost";

export default class RotaryEncoderServiceHost extends SensorServiceHost<[number]> {
    readonly clicksPerTurn: RegisterHost<[number]>;

    constructor() {
        super(SRV_ROTARY_ENCODER, { readingValues: [0], streamingInterval: 50 });

        this.clicksPerTurn = this.addRegister<[number]>(RotaryEncoderReg.ClicksPerTurn, [12]);
    }

    async rotate(clicks: number) {
        const [position] = this.reading.values();
        this.reading.setValues([position + (clicks >> 0)]);
    }
}
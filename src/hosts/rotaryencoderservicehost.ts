import { ButtonEvent, RotaryEncoderReg, SRV_BUTTON, SRV_ROTARY_ENCODER } from "../jdom/constants";
import JDSensorServiceHost from "./sensorservicehost";
import JDRegisterHost from "../jdom/registerhost";

export default class RotaryEncoderServiceHost extends JDSensorServiceHost<number> {
    readonly clicksPerTurn: JDRegisterHost<[number]>;

    constructor() {
        super(SRV_ROTARY_ENCODER, { readingValues: [0], streamingInterval: 50 });

        this.clicksPerTurn = this.addRegister<[number]>(RotaryEncoderReg.ClicksPerTurn, [12]);
    }

    async rotate(clicks: number) {
        const [position] = this.reading.values();
        this.reading.setValues([position + (clicks >> 0)]);
    }
}
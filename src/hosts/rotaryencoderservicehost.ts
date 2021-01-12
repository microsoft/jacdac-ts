import { ButtonEvent, RotaryEncoderReg, SRV_BUTTON, SRV_ROTARY_ENCODER } from "../jdom/constants";
import JDSensorServiceHost from "./sensorservicehost";
import JDRegisterHost from "../jdom/registerhost";

export default class RotaryEncoderServiceHost extends JDSensorServiceHost {
    readonly clicksPerTurn: JDRegisterHost;

    constructor() {
        super(SRV_ROTARY_ENCODER, [0], 50);

        this.clicksPerTurn = this.addRegister(RotaryEncoderReg.ClicksPerTurn, [12]);
    }

    async rotate(clicks: number) {
        const [position] = this.reading.values<[number]>();
        this.reading.setValues<[number]>([position + (clicks >> 0)]);
    }
}
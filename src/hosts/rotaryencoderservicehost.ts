import { ButtonEvent, RotaryEncoderReg, SRV_BUTTON, SRV_ROTARY_ENCODER } from "../jdom/constants";
import JDSensorServiceHost from "./sensorservicehost";
import JDRegisterHost from "../jdom/registerhost";

export default class RotaryEncoderServiceHost extends JDSensorServiceHost {
    readonly clicksPerTurn: JDRegisterHost;

    constructor() {
        super(SRV_ROTARY_ENCODER, "i32", [0], 50);

        this.clicksPerTurn = this.addRegister(RotaryEncoderReg.ClicksPerTurn, "u16", [12]);
    }

    async rotate(offset: number) {
        const [position] = this.reading.values<[number]>();
        this.reading.setValues<[number]>([position + (offset >> 0)]);
    }
}
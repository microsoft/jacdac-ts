import { RotaryEncoderReg, SRV_ROTARY_ENCODER } from "../jdom/constants";
import SensorServer from "./sensorserver";
import JDRegisterServer from "../jdom/registerserver";

export default class RotaryEncoderServer extends SensorServer<[number]> {
    readonly clicksPerTurn: JDRegisterServer<[number]>;

    constructor() {
        super(SRV_ROTARY_ENCODER, { readingValues: [0], streamingInterval: 50 });

        this.clicksPerTurn = this.addRegister<[number]>(RotaryEncoderReg.ClicksPerTurn, [12]);
    }

    async rotate(clicks: number) {
        const [position] = this.reading.values();
        this.reading.setValues([position + (clicks >> 0)]);
    }
}
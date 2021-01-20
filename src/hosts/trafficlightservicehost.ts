import { SRV_TRAFFIC_LIGHT, TrafficLightReg } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export default class TrafficLightServiceHost extends JDServiceHost {
    readonly red: JDRegisterHost<[boolean]>;
    readonly orange: JDRegisterHost<[boolean]>;
    readonly green: JDRegisterHost<[boolean]>;

    constructor() {
        super(SRV_TRAFFIC_LIGHT);

        this.red = this.addRegister(TrafficLightReg.Red, [true]);
        this.orange = this.addRegister(TrafficLightReg.Orange, [false]);
        this.green = this.addRegister(TrafficLightReg.Green, [false]);
    }
}
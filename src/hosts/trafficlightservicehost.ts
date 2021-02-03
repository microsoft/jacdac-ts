import { SRV_TRAFFIC_LIGHT, TrafficLightReg } from "../jdom/constants";
import RegisterHost from "../jdom/registerhost";
import ServiceHost from "../jdom/servicehost";

export default class TrafficLightServiceHost extends ServiceHost {
    readonly red: RegisterHost<[boolean]>;
    readonly orange: RegisterHost<[boolean]>;
    readonly green: RegisterHost<[boolean]>;

    constructor() {
        super(SRV_TRAFFIC_LIGHT);

        this.red = this.addRegister(TrafficLightReg.Red, [true]);
        this.orange = this.addRegister(TrafficLightReg.Orange, [false]);
        this.green = this.addRegister(TrafficLightReg.Green, [false]);
    }
}
import { SRV_TRAFFIC_LIGHT, TrafficLightReg } from "../jdom/constants";
import RegisterHost from "../jdom/registerhost";
import ServiceHost, { ServiceHostOptions } from "../jdom/servicehost";

export default class TrafficLightServiceHost extends ServiceHost {
    readonly red: RegisterHost<[boolean]>;
    readonly orange: RegisterHost<[boolean]>;
    readonly green: RegisterHost<[boolean]>;

    constructor(options?: ServiceHostOptions) {
        super(SRV_TRAFFIC_LIGHT, options);

        this.red = this.addRegister(TrafficLightReg.Red, [true]);
        this.orange = this.addRegister(TrafficLightReg.Orange, [false]);
        this.green = this.addRegister(TrafficLightReg.Green, [false]);
    }
}
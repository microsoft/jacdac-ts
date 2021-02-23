import { REFRESH, RngVariant, SRV_RNG } from "../jdom/constants";
import SensorServiceHost from "./sensorservicehost";

export default class RandomNumberGeneratorServiceHost extends SensorServiceHost<[Uint8Array]> {
    constructor() {
        super(SRV_RNG, {
            variant: RngVariant.WebCrypto,
            streamingInterval: 10000,
        })

        this.on(REFRESH, this.handleRefresh.bind(this));
    }

    private handleRefresh() {
        // generate new data
        const data = new Uint8Array(64);
        console.log("rnd", { data })
        if (typeof window !== "undefined")
            window.crypto.getRandomValues(data);
        this.reading.setValues([data], true);
    }
}
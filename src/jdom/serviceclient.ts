import { JDService } from "./service";
import { JDDevice } from "./device";
import { JDBus } from "./bus";
import { JDClient } from "./client";

export class JDServiceClient extends JDClient {

    constructor(public readonly service: JDService) {
        super()
    }

    protected get device(): JDDevice {
        return this.service.device
    }

    protected get bus(): JDBus {
        return this.device.bus
    }

    toString(): string {
        return `client of ${this.service}`
    }
}

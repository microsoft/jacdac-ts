import { JDService } from "./service";
import { JDEventSource } from "./eventsource";

export class JDServiceClient extends JDEventSource {
    constructor(public readonly service: JDService) {
        super()
    }

    toString(): string {
        return `client of ${this.service}`
    }
}

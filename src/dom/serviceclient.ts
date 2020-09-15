import { JDService } from "./service";

export class JDServiceClient {
    constructor(public readonly service: JDService) {
    }

    toString(): string {
        return `client of ${this.service}`
    }
}

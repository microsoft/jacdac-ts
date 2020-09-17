import { JDService } from "./service";
import { JDEventSource } from "./eventsource";
import { Observer } from "./observable";

export class JDServiceClient extends JDEventSource {
    private unsubscribers: (() => void)[] = []

    constructor(public readonly service: JDService) {
        super()
    }

    protected get device() {
        return this.service.device
    }

    protected get bus() {
        return this.device.bus
    }

    protected mount(unsubscribe: () => void) {
        if (unsubscribe)
            this.unsubscribers.push(unsubscribe)
    }

    unmount() {
        const us = this.unsubscribers;
        this.unsubscribers = [];
        us.forEach(u => u());
    }

    toString(): string {
        return `client of ${this.service}`
    }
}

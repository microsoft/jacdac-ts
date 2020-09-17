import { JDService } from "./service";
import { JDEventSource } from "./eventsource";
import { JDDevice } from "./device";
import { JDBus } from "./bus";

export class JDServiceClient extends JDEventSource {
    private unsubscribers: (() => void)[] = []

    constructor(public readonly service: JDService) {
        super()
    }

    protected get device(): JDDevice {
        return this.service.device
    }

    protected get bus(): JDBus {
        return this.device.bus
    }

    protected mount(unsubscribe: () => void): () => void {
        if (unsubscribe)
            this.unsubscribers.push(unsubscribe)
        return unsubscribe;
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

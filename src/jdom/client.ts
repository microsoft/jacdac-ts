import { LogLevel } from "../embed/protocol";
import { JDEventSource } from "./eventsource";

export class JDClient extends JDEventSource {
    private unsubscribers: (() => void)[] = []
    constructor() {
        super()
    }

    protected log(msg: any) {
        console.log(msg);
    }

    mount(unsubscribe: () => void): () => void {
        if (unsubscribe && this.unsubscribers.indexOf(unsubscribe) < 0)
            this.unsubscribers.push(unsubscribe)
        return unsubscribe;
    }

    unmount() {
        const us = this.unsubscribers;
        this.unsubscribers = [];
        us.forEach(u => u());
    }
}
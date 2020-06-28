import { EventEmitter, EventHandler } from "./eventemitter";
// tslint:disable-next-line: no-submodule-imports
import { PubSubEngine } from "graphql-subscriptions/dist/pubsub-engine";
import { Register } from "./register";
import { setStreamingAsync } from "./sensor";

export class EventEmitterPubSub extends PubSubEngine {
    private readonly subscriptions: { [key: string]: [string, (...args: any[]) => void] };
    private subIdCounter: number;

    constructor(public readonly eventEmitter: EventEmitter) {
        super();
        this.subscriptions = {};
        this.subIdCounter = 0;
    }

    public publish(triggerName: string, payload: any): Promise<void> {
        this.eventEmitter.emit(triggerName, payload);
        return Promise.resolve();
    }

    public subscribe(triggerName: string, onMessage: EventHandler): Promise<number> {
        this.eventEmitter.addListener(triggerName, onMessage);
        this.subIdCounter = this.subIdCounter + 1;
        this.subscriptions[this.subIdCounter] = [triggerName, onMessage];

        return Promise.resolve(this.subIdCounter);
    }

    public unsubscribe(subId: number) {
        const subs = this.subscriptions[subId];
        if (!subs) return;

        const [triggerName, onMessage] = subs;
        delete this.subscriptions[subId];
        this.eventEmitter.removeListener(triggerName, onMessage);
    }
}

export class StreamingRegisterPubSub extends EventEmitterPubSub {
    constructor(public readonly register: Register) {
        super(register)
    }

    public subscribe(triggerName: string, onMessage: EventHandler): Promise<number> {
        return super.subscribe(triggerName, onMessage)
            .then(id => {
                // send a command to start streaming
                return setStreamingAsync(this.register.service, true)
                    .then(() => id);
            })
    }
}
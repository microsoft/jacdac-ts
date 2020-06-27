import { EventEmitter, EventHandler } from "./eventemitter";
// tslint:disable-next-line: no-submodule-imports
import { PubSubEngine } from "graphql-subscriptions/dist/pubsub-engine";

export interface PubSubOptions {
    eventEmitter?: EventEmitter;
}

export class PubSub extends PubSubEngine {
    protected eventEmitter: EventEmitter;
    private subscriptions: { [key: string]: [string, (...args: any[]) => void] };
    private subIdCounter: number;

    constructor(options: PubSubOptions = {}) {
        super();
        this.eventEmitter = options.eventEmitter || new EventEmitter();
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

export class PubSubComponent {
    private _pubSub: PubSub;

    constructor() {

    }

    get pubSub() {
        if (!this._pubSub)
            this._pubSub = new PubSub();
        return this._pubSub
    }

    on(eventName: string, listener: EventHandler) {
        this.pubSub.subscribe(eventName, listener);
    }

    emit(eventName: string, payload?: any) {
        this.pubSub.publish(eventName, payload);
    }
}
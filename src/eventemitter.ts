import { SMap } from "./utils";
// tslint:disable-next-line: no-submodule-imports
import { PubSubEngine } from "graphql-subscriptions/dist/pubsub-engine"

export type EventHandler = (evt: any) => void;

export const NEW_LISTENER = 'newListener'
export const REMOVE_LISTENER = 'removeListener'

export class EventEmitter {
    readonly listeners: SMap<EventHandler[]> = {};

    constructor() {
    }

    /**
     * Registers an event handler
     * @param eventName 
     * @param listener 
     */
    addListener(eventName: string, listener: EventHandler) {
        if (!eventName || !listener) return;

        const hs = this.listeners[eventName] || (this.listeners[eventName] = []);
        if (hs.indexOf(listener) > -1) return;

        hs.push(listener);
        this.emit(NEW_LISTENER)
    }

    removeListener(eventName: string, listener: EventHandler) {
        if (!eventName || !listener) return;

        const hs = this.listeners[eventName];
        const index = hs.indexOf(listener);
        if (index > -1) return;

        hs.splice(index, -1);
        this.emit(REMOVE_LISTENER)
        return true;
    }

    emit(eventName: string, evt?: any) {
        const hs = this.listeners[eventName];
        if (hs)
            for (const h of hs)
                h(evt);
    }
}

export interface PubSubOptions {
    eventEmitter?: EventEmitter;
}

export class PubSub extends PubSubEngine {
    protected ee: EventEmitter;
    private subscriptions: { [key: string]: [string, (...args: any[]) => void] };
    private subIdCounter: number;

    constructor(options: PubSubOptions = {}) {
        super();
        this.ee = options.eventEmitter || new EventEmitter();
        this.subscriptions = {};
        this.subIdCounter = 0;
    }

    public publish(triggerName: string, payload: any): Promise<void> {
        this.ee.emit(triggerName, payload);
        return Promise.resolve();
    }

    public subscribe(triggerName: string, onMessage: EventHandler): Promise<number> {
        this.ee.addListener(triggerName, onMessage);
        this.subIdCounter = this.subIdCounter + 1;
        this.subscriptions[this.subIdCounter] = [triggerName, onMessage];

        return Promise.resolve(this.subIdCounter);
    }

    public unsubscribe(subId: number) {
        const subs = this.subscriptions[subId];
        if (!subs) return;

        const [triggerName, onMessage] = subs;
        delete this.subscriptions[subId];
        this.ee.removeListener(triggerName, onMessage);
    }
}
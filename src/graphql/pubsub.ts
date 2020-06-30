import { EventEmitter, EventHandler } from "../dom/eventemitter";
// tslint:disable-next-line: no-submodule-imports
import { PubSubEngine } from "graphql-subscriptions/dist/pubsub-engine";
import { Register } from "../dom/register";
import { setStreamingAsync } from "../dom/sensor";
import { REPORT_RECEIVE } from "../dom/constants";
import { DebouncedPoll, debouncedPollAsync } from "../dom/utils";

export class EventEmitterPubSub extends PubSubEngine {
    private readonly subscriptions: { [key: string]: [string, (...args: any[]) => void] };
    private subIdCounter: number;

    constructor(public readonly eventEmitter: EventEmitter) {
        super();
        this.subscriptions = {};
        this.subIdCounter = 0;
    }

    public get length() {
        return Object.keys(this.subscriptions).length
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
    private ensureStreaming: DebouncedPoll;

    constructor(public readonly register: Register) {
        super(register)
        this.startStreaming = this.startStreaming.bind(this)
    }

    private async startStreaming() {
        console.log("start streaming")
        await setStreamingAsync(this.register.service, true)
    }

    public subscribe(triggerName: string, onMessage: EventHandler): Promise<number> {
        if (!this.ensureStreaming) {
            console.log(`start poll streamer`)
            this.ensureStreaming = debouncedPollAsync(this.startStreaming, 1000, 2000)
            this.register.addListener(REPORT_RECEIVE, this.ensureStreaming.execute)
        }
        return super.subscribe(triggerName, onMessage);
    }
    public unsubscribe(subId: number) {
        if (!this.length) {
            this.register.removeListener(REPORT_RECEIVE, this.ensureStreaming.execute)
            this.ensureStreaming.stop();
            this.ensureStreaming = undefined;
            // don't wait
            setStreamingAsync(this.register.service, false)
        }
        super.unsubscribe(subId)
    }
}
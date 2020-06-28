import { SMap } from "./utils";
import { NEW_LISTENER, REMOVE_LISTENER } from "./constants";
export type EventHandler = (evt: any) => void;

export class EventEmitter {
    readonly listeners: SMap<EventHandler[]> = {};

    constructor() {
    }

    on(eventName: string, listener: EventHandler) {
        this.addListener(eventName, listener);
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
        if (!hs.length)
            delete this.listeners[eventName];
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

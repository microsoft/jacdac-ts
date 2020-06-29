import { SMap } from "./utils";
import { NEW_LISTENER, REMOVE_LISTENER, ERROR } from "./constants";
export type EventHandler = (...args) => void;

interface Listener {
    handler: EventHandler;
    once: boolean;
}

export class EventEmitter {
    readonly listeners: SMap<Listener[]> = {};

    constructor() {
    }

    on(eventName: string, handler: EventHandler) {
        return this.addListenerInternal(eventName, handler, false);
    }

    off(eventName: string, handler: EventHandler) {
        return this.removeListener(eventName, handler);
    }

    once(eventName: string, handler: EventHandler) {
        return this.addListenerInternal(eventName, handler, true);
    }

    addListener(eventName: string, handler: EventHandler) {
        return this.addListenerInternal(eventName, handler, false);
    }

    private addListenerInternal(eventName: string, handler: EventHandler, once: boolean): EventEmitter {
        if (!eventName || !handler) return this;

        const listeners = this.listeners[eventName] || (this.listeners[eventName] = []);
        const listener = listeners.find(listener => listener.handler == handler)
        if (listener) {
            listener.once = !!once;
            return;
        }

        this.emit(NEW_LISTENER, eventName, handler)
        listeners.push({
            handler,
            once: !!once
        })
        return this;
    }

    removeListener(eventName: string, handler: EventHandler): EventEmitter {
        if (!eventName || !handler) return this;

        const listeners = this.listeners[eventName]
        if (listeners) {
            for (let i = 0; i < listeners.length; ++i) {
                const listener = listeners[i];
                const handler = listener.handler
                if (handler === handler) {
                    listeners.splice(i, -1);
                    --i;
                    if (listeners.length == 0)
                        delete this.listeners[eventName];
                    this.emit(REMOVE_LISTENER, eventName, handler);
                    return this;
                }
            }
        }
        return this;
    }

    /**
     * Synchronously calls each of the listeners registered for the event named eventName, in the order they were registered, passing the supplied arguments to each.
     * @param eventName 
     * @param args 
     */
    emit(eventName: string, ...args): boolean {
        if (!eventName) return false;

        const listeners = this.listeners[eventName];
        if (!listeners) return false;
        for (let i = 0; i < listeners.length; ++i) {
            const listener = listeners[i];
            const handler = listener.handler;
            if (listener.once) {
                listeners.splice(i, -1);
                --i;
            }
            try {
                handler.apply(null, args);
            }
            catch (e) {
                // avoid recursive errors in error handler
                if (eventName !== ERROR)
                    this.emit(ERROR, e)
            }
        }
        if (listeners.length == 0)
            delete this.listeners[eventName]
        return true;
    }

    listenerCount(eventName: string): number {
        if (!eventName) return 0;
        const listeners = this.listeners[eventName]
        return listeners ? listeners.length : 0
    }

    /**
     * Returns an array listing the events for which the emitter has registered listeners.
     */
    eventNames(): string[] {
        return Object.keys(this.listeners)
    }
}
